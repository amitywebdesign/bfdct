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

## Hosting

### GitHub Pages (set up in this repository)

One-time setup (a person with admin rights on the repository):

1. Repository **Settings > Pages > Build and deployment > Source: GitHub Actions**.
2. That's it. Every push to the repository's default branch builds, checks, and
   publishes the site (the `Deploy to GitHub Pages` workflow, under the **Actions** tab).
   The address is shown in the workflow run and in Settings > Pages. It looks like
   `https://<owner>.github.io/<repo>/`.

How it behaves:

- **Editing on GitHub publishes automatically** in a minute or two. If the checks find
  a problem (broken link, bad JSON), the deploy stops and the live site stays as it was.
  Open the failed run under Actions to see why.
- **A daily rebuild** (about 5am Eastern) rolls over event dates, alerts, and years of
  service. GitHub pauses scheduled runs after 60 days with no activity in the
  repository; any commit, or **Actions > Deploy to GitHub Pages > Run workflow**, restarts it.
- **Other branches** are only built and checked (`CI`), never published.
- **Preview before it goes live:** `npm start` on a computer, or `npm run build:offline`
  and open `_offline/index.html`.
- **Custom domain** (for example bethanyfirect.org): set it in Settings > Pages, then tick
  *Enforce HTTPS* once GitHub has issued the certificate, and run the workflow again.
  The site adjusts its own links. **Read the DNS warning in
  [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md) first: it can break the department's email.**
- Pages on a **private** repository needs a paid GitHub plan. Public repositories are free.

What GitHub Pages can't do, and what the site does instead:

| Feature | Netlify / Cloudflare | GitHub Pages (this site) |
|---|---|---|
| Old URLs (`/about-us`, ...) | 301 redirects (`_redirects`) | A small page at each old URL that redirects at once and names the new address |
| Security headers | `_headers` file | The same Content-Security-Policy in a `<meta>` tag. Pages cannot send the `frame-ancestors` header, so other sites could embed this one in a frame |
| Form service | any | Use Formspree or another hosted endpoint (Netlify Forms won't work) |

Build it the same way locally with `npm run build:pages` (or `npm run check:pages`).
Set `PATH_PREFIX=/<repo>/` and `SITE_URL=https://<owner>.github.io/<repo>` to mimic a
project site.

### Netlify or Cloudflare Pages

Both read the generated `_redirects` and `_headers` files:

- Build command: `npm run build`
- Publish directory: `_site`
- Node version: 20 or newer
- Production: set `SITE_URL` to the final address (for example `https://bethanyfirect.org`)
- Preview/staging builds: set `STAGING=1` so search engines skip them
- Add a **daily rebuild** (a build hook called by a free scheduler).

Old URLs live in `src/_data/redirectMap.json` and feed both hosts. The browser also
hides expired alerts and events between rebuilds.

## Keep it fresh

Quarterly: post a "From the Chief" note, and click through every page for stale
dates. January: update call volume and member numbers, and the impact examples.
