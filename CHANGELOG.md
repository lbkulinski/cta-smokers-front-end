# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-03-24

### Added

- SvelteKit + Tailwind SPA for browsing and submitting smoker reports on CTA trains
- GitHub Actions workflow to deploy to Cloudflare Workers
- Dark/goth theme with line-filtered station dropdowns
- Station dropdowns ordered by actual route order, with branch qualifiers for duplicate names and State/Lake excluded (closed until 2029)
- Destination dropdown using bundled CTA stops data and terminal stations, ordered by route direction, with Loop as a destination for Brown, Orange, Pink, and Purple lines
- Line filtering and grouping of duplicate car reports on the home page
- Report form with 4-digit car number and 3-digit run number fields, location hints, and input validation
- Success message confirming the report was submitted on the user's behalf, with a CTA contact link
- Pagination, midnight boundary handling, rate limit errors, and visibility-based refresh
- Footer with Buy Me a Coffee and cta4j.com links
- Favicon, Apple-touch-icon, Open Graph meta tags, og:image (no-smoking symbol), canonical links, and sitemap for SEO and social previews
- Accessibility meeting WCAG 2.1 AA standards (contrast ratios, focus management, form field heights)

[Unreleased]: https://github.com/lbkulinski/cta-smokers-front-end/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/lbkulinski/cta-smokers-front-end/releases/tag/v1.0.0
