// The burn permit page is published only after the Fire Marshal has confirmed
// the fee, how to apply, and the day-of phone number. Until then it is not built.
export default {
  eleventyComputed: {
    permalink: (data) => (data.site.flags.burnPermitsPublished ? "/safety/burn-permits/index.html" : false),
  },
};
