export default {
  eleventyComputed: {
    permalink: (data) => (data.env.pages ? `${data.r.from}/index.html` : false),
  },
};
