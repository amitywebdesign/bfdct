// GitHub Pages ignores _headers, so it is not published there (the CSP is a <meta> tag instead).
export default {
  eleventyComputed: { permalink: (data) => (data.env.pages ? false : "/_headers") },
};
