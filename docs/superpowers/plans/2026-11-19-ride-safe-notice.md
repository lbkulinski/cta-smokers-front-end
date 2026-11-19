# NITA Ride Safe Notice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Point users to NITA's Ride Safe app on the home page (dismissable box with feedback ask) and after a successful report (separate card), and drop the obsolete "submitted to the CTA" line.

**Architecture:** One `RideSafeNotice.svelte` component with two variants (`banner`, `success`). Link targets, phone number and feedback mailto values live in `src/lib/constants.ts`. Dismissal of the banner is stored in localStorage under a versioned key.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), TypeScript, Tailwind CSS 4. The project has no test runner; verification is `npm run check`, `npm run build`, and a browser check against the approved mockup.

**Spec:** `docs/superpowers/specs/2026-11-19-ride-safe-notice-design.md`
**Visual source of truth (approved mockup, Tailwind classes included):** `docs/superpowers/specs/2026-11-19-ride-safe-notice-mockup/index.html` (banner) and `report.html` (success card)

## Global Constraints

- App name is "Ride Safe" (page title "Ride Safe App"); never "Safe Ride".
- App URL `https://nita.illinois.gov/safety/app`; text number display `312-313-9015`, link `sms:+13123139015`; feedback email `admin@ctasmokers.com`.
- External links: `target="_blank" rel="noopener noreferrer"`.
- Copy is exact:
  - Banner line 1: `NITA has a new rider safety app: Ride Safe.`
  - Banner line 2: `Report smoking and other safety concerns by app or text. Your report goes to the right transit team.`
  - Success line: `This report stays on this site. To alert transit staff, use NITA Ride Safe.`
  - Links: `Get the app ↗` and `Text 312-313-9015`
  - Feedback: `Would you like this site to stay up?` with `Keep it` / `Fine to shut down`
- Mailto subjects: `Keep CTA Smokers` and `OK to shut down CTA Smokers` (URL-encoded).
- Banner dismissal is permanent (no expiry), per browser, localStorage key `ride-safe-notice-v1`; every storage access wrapped in try/catch.
- Success card is never dismissable and does not read the dismissal key.
- Mobile-first: 40px+ tap targets for links/buttons, 44px dismiss target, stacked feedback buttons on phones (as in the mockup).
- Home page is prerendered with SSR; the banner must render only after mount so dismissers never see a flash.
- Work on a feature branch from `main`; do not commit unrelated working-tree changes (`.github/*`, `scripts/`, other docs).

## Review Focus

- localStorage unavailable or throwing (private mode): banner still shows, × hides it for the current view, no console error.
- Banner appears in all home states (loading, error, empty, populated), not only when reports exist.
- Narrow phone width (320px): no horizontal scroll; the two feedback buttons and the links wrap cleanly.
- Keyboard/screen reader: × has an accessible label, links have visible focus, success card is not announced as an error.
- Forwarding sentence fully gone from the report success state.

---

### Task 1: Constants and `RideSafeNotice` component

**Files:**
- Modify: `src/lib/constants.ts` (append)
- Create: `src/lib/components/RideSafeNotice.svelte`

**Interfaces:**
- Produces in `constants.ts`: `export const RIDE_SAFE = { url: string, textNumber: string, textHref: string, feedbackEmail: string, keepSubject: string, shutDownSubject: string, dismissKey: string }` (values per Global Constraints; `dismissKey` is `'ride-safe-notice-v1'`).
- Produces: `RideSafeNotice.svelte` with props `{ variant: 'banner' | 'success' }`.

- [ ] **Step 1: Add `RIDE_SAFE` to `src/lib/constants.ts`** with the values above; `textHref` is `sms:+13123139015`. Add a one-line comment that removing the notice means deleting this constant and the component.
- [ ] **Step 2: Create `RideSafeNotice.svelte`** reproducing the mockup markup and classes exactly, with copy from Global Constraints. Both variants share the link row and the feedback block (extract them as `{#snippet}`s inside the component, not separate files). `banner` has lines 1 and 2 and the × button; `success` has only its single bold line.
- [ ] **Step 3: Implement dismissal for `banner`.** `let mounted = $state(false); let dismissed = $state(false);` In `onMount`, read `localStorage.getItem(RIDE_SAFE.dismissKey)` inside try/catch, set `dismissed` if it equals `'1'`, then set `mounted = true`. The banner renders only when `mounted && !dismissed`. The × handler sets `dismissed = true` and writes `'1'` to storage inside try/catch (ignore failures). The `success` variant renders immediately, with no storage access.
- [ ] **Step 4: Verify** — Run `npm run check`. Expected: 0 errors, 0 warnings from the new files.
- [ ] **Step 5: Commit** — `git add src/lib/constants.ts src/lib/components/RideSafeNotice.svelte && git commit -m "feat: add RideSafeNotice component"`

### Task 2: Wire into home page and report success; remove forwarding line

**Files:**
- Modify: `src/routes/+page.svelte` (insert after the header block that ends at the closing `</div>` before `{#if loading}`)
- Modify: `src/routes/report/+page.svelte` (success block)

**Interfaces:**
- Consumes: `RideSafeNotice` with `variant="banner"` / `variant="success"`.

- [ ] **Step 1: Home page** — import the component and render `<RideSafeNotice variant="banner" />` between the page header and `{#if loading}`, so it shows in every state.
- [ ] **Step 2: Report page** — in the `{#if submitted}` block, delete the `<p>` reading "This report has been submitted to the CTA on your behalf.", keep the green box as confirmation + "View active reports" link, and render `<RideSafeNotice variant="success" />` immediately after the green box (still inside `{#if submitted}`). Adjust the green box's bottom margin to the mockup's `mb-4` so the card sits right below it.
- [ ] **Step 3: Verify build** — Run `npm run check && npm run build`. Expected: both succeed.
- [ ] **Step 4: Browser verification** — Run `npm run dev` and compare against the mockup pages at 390px and 320px widths (DevTools device mode). Confirm: banner shows on `/` while loading, with the error state (stop the API), and populated; × hides it and it stays hidden after reload; after clearing `ride-safe-notice-v1` it returns; with storage blocked it shows and × still hides it for the view; `/report` shows the card after a successful submit (or temporarily set `submitted` to a stub value to view it, then revert); no forwarding sentence anywhere; no horizontal scroll.
- [ ] **Step 5: Commit** — `git add src/routes/+page.svelte src/routes/report/+page.svelte && git commit -m "feat: show Ride Safe notice on home and report success"`

### Task 3: Changelog and docs

**Files:**
- Modify: `CHANGELOG.md` under `## [Unreleased]`
- Add (already on disk): the spec, plan, and mockup files under `docs/superpowers/`

- [ ] **Step 1: Changelog** — add `### Added` (Ride Safe notice on the home page and report confirmation, with a feedback ask) and `### Removed` (the "submitted to the CTA on your behalf" confirmation text, since report forwarding is disabled).
- [ ] **Step 2: Commit** — `git add CHANGELOG.md docs/superpowers/specs/2026-11-19-ride-safe-notice-design.md docs/superpowers/specs/2026-11-19-ride-safe-notice-mockup docs/superpowers/plans/2026-11-19-ride-safe-notice.md && git commit -m "docs: add Ride Safe notice design, plan and changelog"`
