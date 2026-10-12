# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning: [SemVer](https://semver.org/).

## [0.1.0] - 2026-10-12

First release: a complete GOV.UK transactional service ("apply for a bird ringing licence") built to
the GDS way with [GOV.UK Frontend](https://www.npmjs.com/package/govuk-frontend) 6, Express 5 and
Nunjucks, in TypeScript.

### Added
- A one-thing-per-page journey (name, species, reserve, start date), then check-your-answers and a
  confirmation panel with a reference number.
- **Progressive enhancement**: the whole journey is server-rendered post/redirect/get forms that work
  with JavaScript disabled; JavaScript only enhances. An e2e test drives the journey with JS off.
- **Accessible validation**: server-side only (`novalidate`), with an error summary that takes focus,
  inline messages, `Error:` page titles, and a three-field date input that names and highlights the
  specific part that is wrong.
- **Check-your-answers craft**: "Change" links return to check-answers after an edit; a resume guard
  bounces an unfinished application back to the first unanswered question.
- GOV.UK components throughout: text input, radios with a conditional reveal, date input, error
  summary, summary list, panel, phase banner, back links, plus `404` / `500` pages and an
  accessibility statement.
- A neutral service header and an honest footer in place of the GOV.UK Crown, logotype, Open
  Government Licence and Crown copyright, which are reserved for live government services.
- **Tests**: Vitest unit tests for every validator branch and journey helper; Playwright end-to-end
  for the journey (JS on and off), the change round-trip and the resume guard; and axe (WCAG 2.1 AA)
  on every page. Type-aware ESLint and `tsc` strict typechecking gate CI across Node 20 and 22.

[0.1.0]: https://github.com/raby/ringing/releases/tag/v0.1.0
