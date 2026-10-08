# How to update the Bethany Fire website

The site is plain HTML built from small data files. Most updates mean editing one
JSON file, not page code. Changes need the **Chief's approval** before they go live.

## Two ways to edit

**On GitHub (easiest, no install).** Open the file in the repository, click the
pencil icon, make the change, and commit. The host rebuilds the site by itself in
about a minute. Invalid JSON (a missing comma or quote) will fail the build and
the old site stays up, so check the build status.

**On a computer.** Install Node 20 or newer, then:

```
npm install        # once
npm start          # live preview at http://localhost:8080
npm run check      # build + checks (links, headings, contrast, launch blockers)
npm run build:offline   # then double-click _offline/index.html (no server needed)
```

Don't open `_site/index.html` directly: that build is for a web host, so from disk it
shows as a plain white page with no styles. Use `npm start` or the offline build.

## Where things live

| To change... | Edit this file (in `src/_data/`) |
|---|---|
| The red/yellow alert bar | `alert.json` (set `active`, `message`, `expires`) |
| Featured events, the events list | `events.json` |
| Sponsors | `sponsors.json` (+ logo in `src/assets/img/sponsors/`) |
| Apparatus specs and photos | `apparatus.json` |
| Stations | `stations.json` |
| Timeline / history | `timeline.json` |
| Home page "by the numbers" | `stats.js` (call volume and members: replace `null` with the number) |
| "Where your gift goes" examples | `impact.json` |
| Member stories on /join/ | `stories.json` (only with the member's consent) |
| Form 990 and financial summary | `transparency.json` (+ the PDF in `src/assets/docs/`) |
| Ambulance billing FAQ | `billingFaq.json` |
| Safety tip cards | `safetyTips.json` |
| Burn permit details | `burnPermits.json` (then see "Publishing burn permits") |
| Phone, address, links, PayPal, flags | `site.json` |
| Where each form's messages go | `forms.json` |
| Navigation | `nav.json` |
| Colors | the `:root` block at the top of `src/assets/css/main.css` |

Run `npm run check` after a change. It tells you about broken links, missing text,
and color combinations that fail accessibility contrast.

## Common jobs

**Post an alert.** In `alert.json` set `"active": true`, write the `message`, and set
`expires` to the last day it should show. It also hides itself after that date.

**Add an event.** Copy an entry in `events.json`. `start` and `end` use the New York
offset (`-04:00` in summer, `-05:00` in winter). `featured: true` puts it on the home
page; the first one that hasn't ended is the one shown. If the date isn't known, use
`"dateTBD": true` and leave out `start`/`end`. Each event with its own page also has a
page in `src/events/` (past events switch to a thank-you message automatically).

**Add a news post.** Copy `src/news/posts/example-post.md`, rename it, set `title`,
`date`, and `summary`, and delete the `draft: true` line. Incident posts: no victim
photos, no street addresses.

**Add a sponsor.** Add `{ "name": "...", "tier": "patriot", "url": "https://...", "logo": "name.png" }`
to `sponsors.json`. Tiers are `medal-of-honor`, `allegiance`, `patriot`, `liberty`,
`freedom`. Only add a business that has given permission to show its logo.

**Add a photo.** Put the original (JPEG, at least 1800 px wide) in `src/assets/img/photos/`
and use its file name in the matching data file (for example `"photo": "photos/engine-83.jpg"`
in `apparatus.json`). The site makes the small, fast versions by itself. The hero photo
is `photos/hero.jpg`. **Every identifiable person needs a signed consent form, and minors
need a parent's consent.**

**Connect a form.** Create a form at your form service (such as Formspree), set where its
messages go (the right role inbox), and paste its URL into `forms.json`. Until then a
form shows "This form isn't connected yet" and sends nothing.

**Connect the Donate button.** Copy `hosted_button_id` from the existing PayPal
button and paste it into `site.json` under `donate.paypalHostedButtonId`. Add the
check-mailing address at `donate.mailingAddress`.

**Publishing burn permits.** Fill in `fee`, `howToApply`, `dayOfPhone`, and
`lastVerified` in `burnPermits.json` with the Fire Marshal's confirmed answers, add the
Town's form URL and the state fire-danger URL in `site.json` (`townLinks`), then set
`flags.burnPermitsPublished` to `true`. `npm run check` refuses to pass if the flag is on
and anything is missing. Re-verify with the Marshal each year.

## Hosting settings

Works on Cloudflare Pages or Netlify (both read `_redirects` and `_headers`):

- Build command: `npm run build`
- Publish directory: `_site`
- Node version: 20 or newer
- Production: set `SITE_URL` to the final address (for example `https://bethanyfirect.org`)
- Preview/staging builds: set `STAGING=1` so search engines skip them
- Add a **daily rebuild** (a build hook called by a free scheduler). Events, alerts, and
  "years of service" roll over at build time; the browser also hides expired alerts and
  events between rebuilds.

## Keep it fresh

Quarterly: post a "From the Chief" note, and click through every page for stale
dates. January: update call volume and member numbers, and the impact examples.
