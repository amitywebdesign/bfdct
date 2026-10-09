import { EleventyHtmlBasePlugin } from "@11ty/eleventy";
import { DateTime } from "luxon";
import Image from "@11ty/eleventy-img";
import fs from "node:fs";
import path from "node:path";

const TZ = "America/New_York";
// OFFLINE=1 writes a copy of the site with relative links into _offline/ that
// opens by double-clicking _offline/index.html (no web server needed).
const OFFLINE = process.env.OFFLINE === "1";
const OUT = OFFLINE ? "_offline" : "_site";

export default function (eleventyConfig) {
  // Hosting under a sub-path (GitHub Pages project sites live at /<repo>/):
  // set PATH_PREFIX=/bfdct/ and every root-relative link, src, and srcset in the
  // built HTML is prefixed automatically. Unset (the default) leaves URLs alone.
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  // ---- Start every real build from an empty output folder, so switching between the
  // default, Pages, and offline modes can never leave stale files behind.
  eleventyConfig.on("eleventy.before", ({ runMode }) => {
    if (runMode === "build") fs.rmSync(OUT, { recursive: true, force: true });
  });

  // ---- Drafts: `draft: true` posts show in `npm start` but never in a real build
  eleventyConfig.addPreprocessor("drafts", "*", (data) => {
    if (data.draft && process.env.ELEVENTY_RUN_MODE === "build") return false;
  });

  // ---- Static files copied as-is -------------------------------------------
  eleventyConfig.addPassthroughCopy("src/assets/css");
  eleventyConfig.addPassthroughCopy("src/assets/js");
  eleventyConfig.addPassthroughCopy("src/assets/docs");
  eleventyConfig.addPassthroughCopy("src/assets/img/*.{svg,png,ico,webp,jpg}");
  eleventyConfig.addPassthroughCopy("src/assets/img/sponsors");
  // Self-hosted fonts (no third-party requests): only the weights the CSS uses.
  const fontFiles = {
    "node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2": "assets/fonts/barlow-condensed-600.woff2",
    "node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2": "assets/fonts/barlow-condensed-700.woff2",
    "node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-400-normal.woff2": "assets/fonts/source-sans-3-400.woff2",
    "node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-600-normal.woff2": "assets/fonts/source-sans-3-600.woff2",
    "node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-700-normal.woff2": "assets/fonts/source-sans-3-700.woff2",
  };
  eleventyConfig.addPassthroughCopy(fontFiles);

  // ---- Filters -------------------------------------------------------------
  const dt = (v) =>
    v instanceof Date ? DateTime.fromJSDate(v, { zone: TZ }) : DateTime.fromISO(String(v), { zone: TZ });

  eleventyConfig.addFilter("dateLong", (v) => dt(v).toFormat("cccc, LLLL d, yyyy"));
  eleventyConfig.addFilter("dateShort", (v) => dt(v).toFormat("LLL d"));
  eleventyConfig.addFilter("dateMonth", (v) => dt(v).toFormat("LLL").toUpperCase());
  eleventyConfig.addFilter("dateDay", (v) => dt(v).toFormat("d"));
  eleventyConfig.addFilter("timeOnly", (v) => dt(v).toFormat("h:mm a").replace(":00", ""));
  eleventyConfig.addFilter("isoDate", (v) => dt(v).toISODate());
  eleventyConfig.addFilter("isoDateTime", (v) => dt(v).toISO());
  // Join, don't resolve: `new URL("/about/", "https://x.github.io/bfdct")` would drop /bfdct.
  eleventyConfig.addFilter("absoluteUrl", (p, base) => {
    if (typeof p !== "string") return ""; // unpublished pages have page.url === false
    if (/^https?:\/\//.test(p)) return p; // already absolute (e.g. an ogImage on another host)
    return base.replace(/\/$/, "") + (p.startsWith("/") ? p : "/" + p);
  });
  // Path from one site URL to another, for redirect stubs: ("/home", "/") -> "../"
  eleventyConfig.addFilter("relativePath", (from, to) => {
    const fromDir = from.endsWith("/") ? from : from + "/";
    let rel = path.posix.relative(fromDir, to) || ".";
    if (to.endsWith("/") && !rel.endsWith("/")) rel += "/";
    return rel;
  });
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v));
  eleventyConfig.addFilter("isPast", (v) => dt(v) < DateTime.now().setZone(TZ));
  eleventyConfig.addFilter("upcoming", (events) =>
    (events || []).filter((e) => !e.end || dt(e.end) >= DateTime.now().setZone(TZ))
  );
  // Featured events that have not ended, soonest first; undated ("TBA") last.
  eleventyConfig.addFilter("featured", (events) =>
    (events || [])
      .filter((e) => e.featured && (!e.end || dt(e.end) >= DateTime.now().setZone(TZ)))
      .sort((a, b) => (a.start ? dt(a.start).toMillis() : Infinity) - (b.start ? dt(b.start).toMillis() : Infinity))
  );
  eleventyConfig.addFilter("where", (arr, key, value) => (arr || []).filter((x) => x[key] === value));
  eleventyConfig.addFilter("head", (arr, n) => (arr || []).slice(0, n));
  eleventyConfig.addFilter("findById", (arr, id) => (arr || []).find((x) => x.id === id));
  eleventyConfig.addFilter("pad", (n) => String(n).padStart(2, "0"));
  eleventyConfig.addFilter("tel", (s) => "+1" + String(s).replace(/\D/g, ""));

  // Is this page in the given nav section? (for aria-current / active styling)
  eleventyConfig.addFilter("inSection", (pageUrl, itemUrl) => {
    if (typeof pageUrl !== "string") return false; // unpublished pages have page.url === false
    return itemUrl === "/" ? pageUrl === "/" : pageUrl.startsWith(itemUrl);
  }
  );

  // ---- Responsive images ---------------------------------------------------
  // {% image "photos/engine-83.jpg", "Alt text", "(min-width: 800px) 50vw, 100vw" %}
  // Looks in src/assets/img/photos/. Emits <picture> with AVIF/WebP/JPEG, lazy
  // loaded. If the photo has not been added yet, emits a neutral placeholder so
  // the layout still works before the photo shoot.
  eleventyConfig.addAsyncShortcode("image", async function (file, alt, sizes = "100vw", eager = false) {
    const src = file ? path.join("src/assets/img", file) : null;
    if (!src || !fs.existsSync(src)) {
      // Decorative (empty alt) placeholders are hidden from screen readers.
      return alt
        ? `<div class="ph" role="img" aria-label="${alt} (photo coming soon)"></div>`
        : `<div class="ph" aria-hidden="true"></div>`;
    }
    const meta = await Image(src, {
      widths: [480, 800, 1200, 1800],
      formats: ["avif", "webp", "jpeg"],
      outputDir: `./${OUT}/assets/img/photos/`,
      urlPath: "/assets/img/photos/",
      sharpAvifOptions: { quality: 55 },
      sharpWebpOptions: { quality: 72 },
      sharpJpegOptions: { quality: 76 },
    });
    return Image.generateHTML(meta, {
      alt: alt || "",
      sizes,
      loading: eager ? "eager" : "lazy",
      decoding: "async",
      ...(eager ? { fetchpriority: "high" } : {}),
    });
  });

  // ---- Collections ---------------------------------------------------------
  eleventyConfig.addCollection("news", (api) =>
    api.getFilteredByGlob("src/news/posts/*.md").sort((a, b) => b.date - a.date)
  );

  eleventyConfig.addGlobalData("year", () => new Date().getFullYear());
  eleventyConfig.addGlobalData("siteUrl", () => {
    if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
    return JSON.parse(fs.readFileSync("src/_data/site.json", "utf8")).url;
  });

  if (OFFLINE) {
    // Rewrite root-absolute URLs (/assets/x.css, /about/) to paths relative to
    // each page, and point folder links at their index.html.
    const toRelative = (from, u) => {
      if (!u.startsWith("/") || u.startsWith("//")) return u;
      const [, p, rest = ""] = u.match(/^([^?#]*)([?#].*)?$/);
      let target = path.join(OUT, p);
      if (p.endsWith("/") || !path.extname(p)) target = path.join(target, "index.html");
      const rel = path.relative(path.dirname(from), target).split(path.sep).join("/");
      return rel + rest;
    };
    eleventyConfig.addTransform("offline-relative-urls", function (content) {
      const from = this.page.outputPath;
      if (!from || !from.endsWith(".html")) return content;
      return content
        .replace(/<link rel="preload"[^>]*as="font"[^>]*>\s*/g, "") // blocked on file://, not needed offline
        .replace(/(\s(?:href|src|action)=")([^"]*)(")/g, (m, a, u, z) => a + toRelative(from, u) + z)
        .replace(/(\ssrcset=")([^"]*)(")/g, (m, a, v, z) =>
          a + v.split(",").map((part) => { const [u, ...d] = part.trim().split(/\s+/); return [toRelative(from, u), ...d].join(" "); }).join(", ") + z);
    });
  }

  eleventyConfig.setServerOptions({ showVersion: false });

  return {
    dir: { input: "src", output: OUT, includes: "_includes", data: "_data" },
    pathPrefix: process.env.PATH_PREFIX || "/",
    templateFormats: ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
