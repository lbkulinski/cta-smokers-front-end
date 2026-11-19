# NITA Ride Safe notice and feedback ask — design

## Intent
NITA (now running CTA) released a rider safety app, "Ride Safe" (https://nita.illinois.gov/safety/app; the page title is "Ride Safe App"), plus a text line (312-313-9015). Point users to it on the home page and after they report. The owner may eventually shut the site down and wants to ask users whether it should stay (reply by email to admin@ctasmokers.com). Everything added must be easy to remove.

## Goals
- Home page: a dismissable box above the reports list announcing the app and carrying the feedback ask.
- After a successful report: a separate Ride Safe card (not inside the green success box) under the confirmation, with a short message, app/text links, and the same feedback ask as the home box. No repeated app intro (users have likely seen the home box).
- Remove the now-false "submitted to the CTA on your behalf" line (backend report forwarding is disabled).

## Non-goals / anti-goals
- No claims about Ride Safe features beyond what the owner stated; no implied affiliation with, or replacement by, NITA.
- Feedback copy is a neutral question ("Would you like this site to stay up?"), not hinting a decision has been made.
- No footer link and no pre-submit note on the report form.

## Constraints
- SvelteKit + Tailwind, existing dark palette and focus-outline conventions.
- External links use `target="_blank" rel="noopener noreferrer"`.
- Text link uses `sms:+13123139015`.
- The box is static content, shown in all home page states (loading, error, empty, populated) unless dismissed.
- Dismissal is remembered per browser in localStorage, wrapped in try/catch; if storage is unavailable the box simply shows every time. Use a versioned key so a future notice can reappear.

## Approaches
1. **Shared component with variants (chosen):** `RideSafeNotice.svelte` with a `banner` variant (home box, dismissable, includes feedback) and a `success` variant (post-report card, different copy, not dismissable, includes feedback). URL, phone number, feedback email and subjects live in `src/lib/constants.ts`. Removal later is one component plus a few constants.
2. Inline markup in each page: simpler up front, but duplicates copy and is harder to remove.
3. Footer link for feedback: rejected by the owner in favor of putting it in the box.

## Design (approved via localhost mockup)
- **Home box (`banner` variant):** dark gray card (`#171717`, `#2a2a2a` border) with a red `#c60c30` left stripe and a × dismiss button top-right.
  - Line 1 (bold): "NITA has a new rider safety app: Ride Safe."
  - Line 2: "Report smoking and other safety concerns by app or text. Your report goes to the right transit team." (matches the NITA page: reports go to the right team; smoking/vaping is a report category.)
  - Line 3: "Get the app ↗ · or text 312-313-9015" (red underlined links).
  - Divider, then: "Would you like this site to stay up? Keep it · Fine to shut down", each a `mailto:admin@ctasmokers.com` with a prefilled subject.
- **Success page (`success` variant):** the green box contains only the confirmation ("Report submitted!", car/line/expiry, "View active reports"). The "submitted to the CTA on your behalf" sentence is removed. Below it, a separate card in the same gray/red-stripe style, no dismiss:
  - Bold: "Transit staff haven't been notified. To alert them, report with NITA Ride Safe."
  - Links: "Get the app ↗ · or text 312-313-9015".
  - Divider, then the same feedback line and mailto links as the home box.
  - Rationale: forwarding is off, so the card must correct the old "submitted to the CTA" expectation. The feedback ask is repeated here because people who just reported are the most engaged, and it still reaches those who dismissed the home box.

## Decisions (owner's calls vs. mine)
- Owner: notice on home page and after reporting; app name and sentence wording; feedback ask via admin@ctasmokers.com, in the home box and the success card; dismissal is permanent (no expiry); slimmer layout; forwarding line is obsolete.
- Mine: dismissable (recommended because the home page is a live feed that repeat visitors see often; owner agreed to the mockup with the ×); styling; two-link mailto format; neutral phrasing.

## Left to the builder
Exact responsive spacing, icon choice, a CHANGELOG entry if convention calls for one.
