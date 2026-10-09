// STAGING=1  preview deploys: tell search engines to skip the site.
// PAGES=1    GitHub Pages build: no server headers or 301s are available, so the
//            Content-Security-Policy goes in a <meta> tag and old URLs get redirect pages.
export default {
  staging: process.env.STAGING === "1",
  pages: process.env.PAGES === "1",
};
