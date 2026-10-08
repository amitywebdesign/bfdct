// Post-build QA for the Bethany Fire site.  Usage:  npm run check   (or: node scripts/check.mjs --strict)
//   ERRORS   always fail the run (broken links, missing titles, bad contrast...).
//   BLOCKERS are launch gates (unconfirmed facts). They only fail the run with --strict.
import fs from "node:fs";
import path from "node:path";

const OUT = "_site";
const strict = process.argv.includes("--strict");
const errors = [];
const warnings = [];
const blockers = [];

const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]
  );

if (!fs.existsSync(OUT)) {
  console.error("No _site folder. Run `npm run build` first.");
  process.exit(1);
}

// ---------- Pages ----------
const files = walk(OUT);
const pages = files.filter((f) => f.endsWith(".html"));
const urlToFile = (u) => {
  const clean = decodeURIComponent(u.split("#")[0].split("?")[0]);
  const candidates = [path.join(OUT, clean), path.join(OUT, clean, "index.html")];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
};
const redirects = fs.existsSync(`${OUT}/_redirects`)
  ? fs.readFileSync(`${OUT}/_redirects`, "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.trim().split(/\s+/))
  : [];
for (const [from, to] of redirects) {
  if (!urlToFile(to)) errors.push(`_redirects: ${from} -> ${to} points at a page that does not exist`);
}

const idsByFile = new Map();
for (const f of pages) {
  const html = fs.readFileSync(f, "utf8");
  idsByFile.set(f, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
}

for (const f of pages) {
  const html = fs.readFileSync(f, "utf8");
  const rel = path.relative(OUT, f);
  const is404 = rel === "404.html";
  const tag = (msg) => `${rel}: ${msg}`;

  if (!/<html lang="en">/.test(html)) errors.push(tag("missing <html lang>"));
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  if (!title) errors.push(tag("missing <title>"));
  else if (title.length > 70) warnings.push(tag(`title is ${title.length} chars (aim for 60 or fewer)`));
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!desc) errors.push(tag("missing meta description"));
  else if (!is404 && (desc.length < 50 || desc.length > 175)) warnings.push(tag(`meta description is ${desc.length} chars`));

  const h1s = [...html.matchAll(/<h1[\s>]/g)].length;
  if (h1s !== 1) errors.push(tag(`has ${h1s} <h1> (needs exactly 1)`));
  let last = 0;
  for (const m of html.matchAll(/<h([1-6])[\s>]/g)) {
    const n = Number(m[1]);
    if (last && n > last + 1) warnings.push(tag(`heading jumps from h${last} to h${n}`));
    last = n;
  }

  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt=/.test(m[0])) errors.push(tag(`<img> without alt: ${m[0].slice(0, 80)}`));

  const seen = new Set();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) {
    if (seen.has(m[1])) errors.push(tag(`duplicate id "${m[1]}"`));
    seen.add(m[1]);
  }

  for (const m of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    const u = m[1];
    if (!u.startsWith("/") || u.startsWith("//")) continue;
    const target = urlToFile(u);
    const isRedirected = redirects.some(([from]) => from === u.split("#")[0].split("?")[0]);
    if (!target && !isRedirected) {
      errors.push(tag(`broken internal link ${u}`));
      continue;
    }
    const frag = u.split("#")[1];
    if (frag && target?.endsWith(".html") && !idsByFile.get(target)?.has(frag)) errors.push(tag(`link ${u}: no element with id "${frag}"`));
  }
  for (const m of html.matchAll(/\shref="#([^"]+)"/g)) if (!idsByFile.get(f).has(m[1])) errors.push(tag(`in-page link #${m[1]} has no target`));

  if (/undefined|\[object |\{\{|\{%|NaN/.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) {
    errors.push(tag("leaked template text (undefined / [object / {{ / NaN)"));
  }
  if (/style="/.test(html)) warnings.push(tag("inline style attribute (blocked by the Content-Security-Policy in _headers)"));
  if (/<script(?![^>]*\bsrc=)(?![^>]*ld\+json)/.test(html)) warnings.push(tag("inline <script> (blocked by the Content-Security-Policy)"));
}

// ---------- Contrast of brand tokens ----------
const css = fs.readFileSync("src/assets/css/main.css", "utf8");
const tok = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]));
for (const m of css.matchAll(/--([\w-]+):\s*var\(--([\w-]+)\)\s*;/g)) if (tok[m[2]]) tok[m[1]] = tok[m[2]]; // aliases like --link
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const pairs = [
  ["hose-charcoal", "cream", "body text"], ["muted", "cream", "muted text"], ["muted", "white", "muted text on cards"],
  ["link", "cream", "links"], ["link", "white", "links on cards"], ["link", "cream-deep", "links on tinted sections"],
  ["white", "station-red", "Join button"], ["white", "station-red-dark", "button hover / red section"],
  ["hose-charcoal", "brass", "Support button"], ["brass", "hose-charcoal", "brass on dark"],
  ["white", "hose-charcoal", "text on dark"], ["alert-yellow", "hose-charcoal", "911 on dark"],
  ["hose-charcoal", "alert-yellow", "alert bar"], ["station-red-dark", "cream", "eyebrows"], ["station-red-dark", "white", "card meta"],
];
for (const [fg, bg, what] of pairs) {
  if (!tok[fg] || !tok[bg]) { errors.push(`contrast: token --${!tok[fg] ? fg : bg} not found`); continue; }
  const r = ratio(tok[fg], tok[bg]);
  if (r < 4.5) errors.push(`contrast: ${what} (--${fg} on --${bg}) is ${r.toFixed(2)}:1, needs 4.5:1`);
}

// ---------- Launch blockers (facts nobody has confirmed yet) ----------
const site = readJson("src/_data/site.json");
const forms = readJson("src/_data/forms.json");
const apparatus = readJson("src/_data/apparatus.json");
const burn = readJson("src/_data/burnPermits.json");
const note = (cond, msg) => cond && blockers.push(msg);
note(!site.social.facebook || !site.social.instagram, "Social links: add Facebook and Instagram URLs in site.json");
note(!site.donate.paypalHostedButtonId, "Donate: paste the PayPal hosted_button_id in site.json (page shows a fallback until then)");
note(!site.donate.mailingAddress, "Donate: add the mailing address for checks in site.json");
note(!site.legal.einVerified, "Treasurer: confirm legal name + EIN, then set legal.einVerified in site.json (EIN stays hidden until then)");
note(!site.flags.safetyContentReviewed, "Safety tips: Chief and Fire Marshal must review src/_data/safetyTips.json, then set flags.safetyContentReviewed");
note(!site.flags.privacyPolicyReviewed, "Privacy page: have the Chief (or Town counsel) review it, then set flags.privacyPolicyReviewed");
note(!site.flags.burnPermitsPublished, "Burn permits: page is held until the Fire Marshal confirms the fee, how to apply, and the day-of number");
if (site.flags.burnPermitsPublished) {
  for (const k of ["fee", "howToApply", "dayOfPhone", "lastVerified"]) if (!burn[k]) errors.push(`burnPermits.json: "${k}" is empty but the burn permit page is published`);
  note(!site.townLinks.burnPermitForm, "Burn permits: add the Town permit form URL (townLinks.burnPermitForm)");
  note(!site.townLinks.fireDanger, "Burn permits: add the state forest fire danger URL (townLinks.fireDanger)");
}
for (const [id, f] of Object.entries(forms)) if (!id.startsWith("_") && !f.endpoint) blockers.push(`Forms: "${id}" has no endpoint in forms.json (shows a 'not connected' message)`);
note(!fs.existsSync("src/assets/img/og-default.png"), "Social preview image: add src/assets/img/og-default.png (1200x630)");
note(fs.readdirSync("src/assets/img/photos").filter((n) => !n.startsWith(".")).length === 0, "Photos: none added yet; pages show neutral placeholders (see docs/HOW-TO-UPDATE.md)");
const blankUnits = apparatus.units.filter((u) => !u.pump && !u.tank && !u.role && !u.year).map((u) => u.unit);
note(blankUnits.length > 0, `Apparatus: specs/photos still needed for ${blankUnits.length} units (${blankUnits.join(", ")})`);
note(readJson("src/_data/sponsors.json").sponsors.length === 0, "Sponsors: sponsor wall is empty (add sponsors who gave logo permission)");
note(readJson("src/_data/billingFaq.json").items.some((i) => !i.a), "Ambulance billing FAQ: some answers are still blank (hidden until filled)");

// ---------- Report ----------
const out = (label, arr) => { if (arr.length) { console.log(`\n${label} (${arr.length})`); arr.forEach((x) => console.log("  - " + x)); } };
console.log(`Checked ${pages.length} pages.`);
out("ERRORS", errors);
out("WARNINGS", warnings);
out("LAUNCH BLOCKERS (see docs/LAUNCH-CHECKLIST.md)", blockers);
if (!errors.length) console.log("\nNo errors." + (blockers.length ? ` ${blockers.length} launch blockers remain.` : " Ready to launch."));
process.exit(errors.length || (strict && blockers.length) ? 1 : 0);
