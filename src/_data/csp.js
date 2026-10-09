// One Content-Security-Policy, used two ways: as the `Content-Security-Policy` header
// in `_headers` (Netlify / Cloudflare Pages) and as a <meta> tag on GitHub Pages.
// Form endpoints and analytics are allowed automatically from forms.json / site.json.
import site from "./site.json" with { type: "json" };
import forms from "./forms.json" with { type: "json" };
import events from "./events.json" with { type: "json" };

const originOf = (url) => {
  try { return new URL(url).origin; } catch { return null; }
};

export default function () {
  const formOrigins = [...new Set(
    Object.entries(forms)
      .filter(([id, f]) => !id.startsWith("_") && f.endpoint)
      .map(([, f]) => originOf(f.endpoint))
      .filter(Boolean)
  )];
  const calendar = [originOf(events.calendarEmbedUrl)].filter(Boolean); // the embed on /events/
  const analytics = site.analytics.plausibleDomain ? ["https://plausible.io"] : [];

  const directives = {
    "default-src": ["'self'"],
    "script-src": ["'self'", ...analytics],
    "style-src": ["'self'"],
    "img-src": ["'self'", "data:", "https:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...formOrigins, ...analytics],
    "frame-src": ["https://www.openstreetmap.org", "https://www.youtube-nocookie.com", ...calendar],
    "form-action": ["'self'", ...formOrigins, "https://www.paypal.com"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
  };
  const render = (d) => Object.entries(d).map(([k, v]) => `${k} ${v.join(" ")}`).join("; ");
  return {
    // <meta> CSP cannot carry frame-ancestors, so only the header version has it.
    meta: render(directives),
    header: render({ ...directives, "frame-ancestors": ["'none'"] }),
  };
}
