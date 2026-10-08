# Launch checklist and open items

`npm run check` prints the current list of launch blockers. `npm run check -- --strict`
fails until every blocker is cleared (use it as the final pre-launch gate).

## Facts that need a person to confirm

| Item | Who | What the site does until then |
|---|---|---|
| Burn permit fee, how to apply, day-of phone number | Fire Marshal (via the Chief) | The page is **not published**. The Safety page says permits come from the Town Fire Marshal and links to the Town's Fire Marshal page. |
| Who actually issues open-burn permits | Fire Marshal | The Town's Fire Marshal web page, as found in a web search, lists hazardous-operation permits (propane, fuel tanks, blasting, fireworks) and did not appear to mention open burning. Confirm before publishing the burn page. |
| Exact legal name and EIN (22-2816991 from the plan) | Treasurer | EIN is hidden until `legal.einVerified` is `true`. No "tax-deductible" wording is used. |
| **Engine 83 tank size** | Chief | Site shows **2,000-gallon tank**, as in the plan. A news report found online describes the new Engine 83 as having **1,000 gallons**. Confirm; it may be a different year or truck. |
| Specs and photos for Engines 81/82, Tankers 82/87, Brush 89, Lima 1/7/8, Utility 1/86, Special Ops trailer, UTV | Chief | Cards say "Details and photo coming soon." |
| What the Lima units are | Chief | They are grouped as "Lima units" with no role. If they are the Ambulance Corps' two ambulances and first-responder vehicle, say so in `apparatus.json`. |
| "Hazmat trailer" (stats strip) vs "Special Ops trailer" (apparatus list) | Chief | Same trailer? Make the wording match. |
| Trunk or Treat location; concert date | Events officer | "Location to be announced" / "Date to be announced". |
| ZIP code 06524 and the map coordinates (41.4415, -72.9916) | Webmaster | Used in the footer, contact page, schema.org data, and map. Confirm against the mail address and Headquarters. |
| Facebook and Instagram URLs | Social admin | Links are hidden. |
| Hinman Station street number | Chief | Shows "Bear Hill Rd". |
| Whether the restored schoolhouse on the Community School campus is the original Center School | Historian | About page mentions it without claiming so. |
| Ambulance billing FAQ answers | Corps lead / billing contact | Only the "who do I contact" answer shows. |
| Impact examples with real costs | Treasurer | Generic one-sentence copy. |
| Form 990 and annual financial summary | Treasurer | "We will post... here." |
| Sponsor names, tiers, logo permission | Events officer | "Sponsor wall is being updated." |
| Call volume and member counts | Chief | Not shown. |
| Mailing address for checks | Treasurer | "Contact us for our mailing address." |
| PayPal `hosted_button_id` | Treasurer | "Online giving is being reconnected." |
| Role descriptions on /join/ (fire, EMS, driver, fire police, support) | Chief | General, one-line descriptions. Make them specific. |
| Safety tip cards | Chief **and** Fire Marshal | General guidance, **unreviewed**. Set `flags.safetyContentReviewed` after review. |
| Privacy page | Chief / Town counsel | Draft. Set `flags.privacyPolicyReviewed` after review. |
| training@ email (Karen R. White Training Program is inactive, so there is no page) | Chief | Decide: forward to the Chief, or retire. |

## Before DNS changes (the biggest risk)

The role email addresses (chief@, assistantchief@, and so on) depend on the domain's
mail settings. Before touching DNS:

1. Find out who the registrar is and who hosts the mail.
2. Write down **every** existing DNS record (especially MX, SPF, DKIM, DMARC) and every email address.
3. Change only the website records (the root/`www` A/CNAME records).
4. Send a test message to and from each address afterward.
5. Pick one canonical domain (bethanyfirect.org or bethanyctfire.org) and redirect the other.
   Set `SITE_URL` to it.

## Launch-day steps

- [ ] `npm run check -- --strict` passes
- [ ] All six forms connected and test-submitted; each reaches the right inbox
- [ ] Every address tested after the DNS change
- [ ] Old URLs redirect (`/home`, `/about-us`, `/apparatus`, `/application-information`, ...)
- [ ] Google Business Profile updated (address, phone, Tuesday 7pm, link)
- [ ] Search Console: submit `/sitemap.xml`
- [ ] Mobile Lighthouse run (target 90+) once real photos are in
- [ ] Walk the site with a keyboard only, and with a screen reader
- [ ] Open-house Tuesday planned

## Not built (by design or later)

- **Phase 0 quick wins** (fixing "20026", replacing the stale concert link, adding the Tuesday invite and 911 line) apply to the *current* site and need its login.
- Members page (Phase 2), "Road to 100", memory wall, apparel, AED map.
- Center Station rental link (add as `townLinks.centerStationRental` once the Town URL is known).
- Employer and family letter (needs the document).
- Opening hours in structured data: Tuesday 7pm is known but no end time is.
- The seal is a stand-in until the original emblem is recovered (see the plan's logo recovery steps).
- Build tooling shows `npm audit` warnings in Eleventy's file watcher and front-matter
  parser. They are dev-only and not part of the published site. Don't run `npm audit fix --force`; it downgrades Eleventy.
