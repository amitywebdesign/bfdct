# Bethany Volunteer Fire Department website

Neighbors protecting neighbors since 1934. Plain HTML, CSS, and a little JavaScript,
built with [Eleventy](https://www.11ty.dev/) from small data files.

```
npm install
npm start          # preview at http://localhost:8080
npm run build      # writes the site to _site/
npm run check      # build + QA (links, headings, alt text, contrast, launch blockers)
npm run build:offline   # a copy you can open by double-clicking _offline/index.html
```

> **Seeing a plain white page?** The normal build (`_site/`) uses links like `/assets/css/main.css`,
> which only work when served from a website root. Opening `_site/index.html` straight from disk
> loads no styles. Use `npm start`, or build the offline copy and open `_offline/index.html`.

- **How to update the site:** [docs/HOW-TO-UPDATE.md](docs/HOW-TO-UPDATE.md)
- **What must be confirmed before launch:** [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md)

## Layout

```
src/_data/           editable content (alerts, events, sponsors, apparatus, ...)
src/_includes/       layouts and partials (header, footer, forms)
src/assets/          css, js, images, documents
src/*.njk, src/*/    pages
src/_redirects       old URLs -> new pages
src/_headers         security headers (Content-Security-Policy)
scripts/check.mjs    post-build QA
```

The site has no third-party scripts, fonts, or trackers. Forms post to a form service
you configure in `src/_data/forms.json`.
