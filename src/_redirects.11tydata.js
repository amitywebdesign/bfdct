export default {
  eleventyComputed: { permalink: (data) => (data.env.pages ? false : "/_redirects") },
};
