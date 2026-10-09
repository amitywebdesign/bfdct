// Post-build QA for the Bethany Fire site.  Usage:  npm run check   (or: node scripts/check.mjs --strict)
//   ERRORS   always fail the run (broken links, missing titles, bad contrast...).
//   BLOCKERS are launch gates (unconfirmed facts). They only fail the run with --strict.
import fs from "node:fs";
import path from "node:path";

const OUT = "_site";
const strict = process.argv.includes("--strict");
// GitHub Pages mode: PAGES=1 (meta CSP + redirect pages), PATH_PREFIX=/bfdct/ (project sites), SITE_URL=https://...
const PAGES = process.env.PAGES === "1";
const PREFIX = "/" + (process.env.PATH_PREFIX || "/").replace(/^\/+|\/+$/g, "");
const PREFIX_SLASH = PREFIX === "/" ? "/" : PREFIX + "/";
const SITE_URL = process.env.SITE_URL ? process.env.SITE_URL.replace(/\/$/, "") : null;
// "/bfdct/about/" -> "/about/";  null when a root-relative URL is missing the prefix.
const unprefix = (u) => {
  if (PREFIX === "/") return u;
  if (u === PREFIX) return "/";
  return u.startsWith(PREFIX_SLASH) ? "/" + u.slice(PREFIX_SLASH.length) : null;
};
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
if (PAGES && redirects.length) errors.push("_redirects was emitted in a PAGES build (GitHub Pages ignores it; redirect pages should be used)");
if (!PAGES && !redirects.length) errors.push("_redirects is missing or empty");

// GitHub Pages cannot send 301s: every old URL must be a page that redirects to a real page.
const redirectMap = readJsonEarly("src/_data/redirectMap.json").list;
const stubFiles = new Set();
for (const r of redirectMap) {
  if (!/^\/[^#?]*[^/#?]$/.test(r.from || "")) errors.push(`redirectMap.json: "from" must start with / and not end with / (got ${JSON.stringify(r.from)})`);
  if (!/^\/[^#?]*$/.test(r.to || "")) errors.push(`redirectMap.json: "to" must be a path starting with / and without # or ? (got ${JSON.stringify(r.to)})`);
}
if (PAGES && fs.existsSync(`${OUT}/_headers`)) errors.push("_headers was emitted in a PAGES build (GitHub Pages ignores it)");
if (!PAGES && !fs.existsSync(`${OUT}/_headers`)) errors.push("_headers is missing");
function readJsonEarly(f) { return JSON.parse(fs.readFileSync(f, "utf8")); }
for (const { from, to } of redirectMap) {
  const stubPath = path.join(OUT, from, "index.html");
  if (!PAGES) {
    if (fs.existsSync(stubPath)) errors.push(`redirect page ${from}/ was emitted outside a PAGES build (it would shadow the 301 on Netlify/Cloudflare)`);
    continue;
  }
  stubFiles.add(path.relative(OUT, stubPath));
  if (!fs.existsSync(stubPath)) { errors.push(`redirect page missing for old URL ${from}`); continue; }
  const stub = fs.readFileSync(stubPath, "utf8");
  const refresh = stub.match(/<meta http-equiv="refresh" content="0; url=([^"]+)"/)?.[1];
  if (!refresh) { errors.push(`redirect page ${from}: no meta refresh`); continue; }
  const resolved = new URL(refresh, `http://x${PREFIX_SLASH}${from.replace(/^\//, "")}/`).pathname; // as the browser resolves it
  const local = unprefix(resolved);
  if (local === null || !urlToFile(local)) errors.push(`redirect page ${from}: refresh target ${refresh} resolves to ${resolved}, which is not a page`);
  else if (local !== to) errors.push(`redirect page ${from}: goes to ${local}, expected ${to}`);
  const canon = stub.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (SITE_URL && canon !== SITE_URL + to) errors.push(`redirect page ${from}: canonical is ${canon}, expected ${SITE_URL + to}`);
}

const idsByFile = new Map();
for (const f of pages) {
  const html = fs.readFileSync(f, "utf8");
  idsByFile.set(f, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
}

for (const f of pages) {
  const html = fs.readFileSync(f, "utf8");
  const rel = path.relative(OUT, f);
  if (stubFiles.has(rel)) continue; // redirect pages are checked above
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

  const srcsetUrls = [...html.matchAll(/\ssrcset="([^"]*)"/g)].flatMap((m) => m[1].split(",").map((x) => x.trim().split(/\s+/)[0]));
  const urls = [...[...html.matchAll(/\s(?:href|src)="([^"]*)"/g)].map((m) => m[1]), ...srcsetUrls];
  for (const raw of urls) {
    if (!raw.startsWith("/") || raw.startsWith("//")) continue;
    const u = unprefix(raw);
    if (u === null) { errors.push(tag(`link ${raw} is missing the ${PREFIX_SLASH} prefix (would 404 on the live site)`)); continue; }
    const target = urlToFile(u);
    const isRedirected = redirects.some(([from]) => from === u.split("#")[0].split("?")[0]);
    if (!target && !isRedirected) {
      errors.push(tag(`broken internal link ${raw}`));
      continue;
    }
    const frag = u.split("#")[1];
    if (frag && target?.endsWith(".html") && !idsByFile.get(target)?.has(frag)) errors.push(tag(`link ${raw}: no element with id "${frag}"`));
  }

  // Canonical + social URLs must be absolute and on the real site address.
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const og = html.match(/property="og:image" content="([^"]*)"/)?.[1];
  if (SITE_URL) {
    if (!canonical?.startsWith(SITE_URL + "/")) errors.push(tag(`canonical ${canonical} is not under SITE_URL ${SITE_URL}`));
    if (!og?.startsWith(SITE_URL + "/")) errors.push(tag(`og:image ${og} is not under SITE_URL ${SITE_URL}`));
  } else if (PREFIX !== "/") warnings.push(tag("PATH_PREFIX is set but SITE_URL is not: canonical URLs will use the default domain"));

  // GitHub Pages: the CSP must travel in a <meta> tag (no headers), and only there.
  const metaCsp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/)?.[1];
  if (PAGES) {
    if (!metaCsp) errors.push(tag("no <meta> Content-Security-Policy (GitHub Pages cannot send headers)"));
    else {
      const policy = metaCsp.replace(/&#39;/g, "'");
      if (/frame-ancestors/.test(policy)) errors.push(tag("meta CSP contains frame-ancestors, which browsers ignore in <meta>"));
      if (!/script-src 'self'/.test(policy)) errors.push(tag("meta CSP lacks script-src 'self'"));
      if (html.indexOf("Content-Security-Policy") > html.search(/<(?:script|link)\b/)) errors.push(tag("meta CSP comes after a script/link tag, so it would not protect it"));
    }
  } else if (metaCsp) errors.push(tag("<meta> CSP present in a non-Pages build (the _headers file carries it there)"));
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
