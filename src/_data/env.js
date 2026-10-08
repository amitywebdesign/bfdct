// Set STAGING=1 on preview deploys so search engines skip them.
export default { staging: process.env.STAGING === "1" };
