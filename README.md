# ringing

**A GOV.UK transactional service, built the GDS way.** A small "apply for a licence" journey,
rendered on the server with the [GOV.UK Design System](https://design-system.service.gov.uk/): one
question per page, a check-your-answers step, and a confirmation with a reference. It works with
JavaScript switched off, meets WCAG 2.1 AA, and every page is checked against
[axe](https://github.com/dequelabs/axe-core) in CI.

The service: *apply for a licence to ring a protected bird species at a nature reserve* (ringing
Schedule 1 birds is a genuinely licensed activity in the UK). The reserves are the same ones
[bird-platform](https://github.com/raby/bird-platform) models, so the two pieces describe one domain.

> **Not a government service.** This is a portfolio demonstration. It uses the Design System but
> deliberately does **not** wear the GOV.UK Crown, the GOV.UK logotype, the Open Government Licence or
> Crown copyright. Those belong to live services on gov.uk. See [Branding](#branding-the-honest-bit).

## Run it

```sh
npm install
npm start          # http://localhost:3000
```

```sh
npm test           # unit tests (Vitest): the journey model and validators
npm run test:e2e   # end-to-end (Playwright): the journey with JS on and off, plus axe on every page
npm run lint       # type-aware ESLint
npm run typecheck  # tsc --noEmit
```

## The journey

```
Start  →  Your name  →  Species  →  Reserve  →  Start date  →  Check your answers  →  Confirmation
            (text)      (radios +    (radios)    (date input)    (summary list)       (panel + ref)
                       conditional
                         reveal)
```

Each question is a `GET` to render and a `POST` to validate-then-redirect, the
[post/redirect/get](https://en.wikipedia.org/wiki/Post/Redirect/Get) pattern, so a refresh never
re-submits. Nothing in that loop needs JavaScript.

## How it is built, and why it matters

The point of the service is the GDS craft, not the code volume. In particular:

- **Progressive enhancement, for real.** The whole journey is server-rendered forms. With JavaScript
  off you still get validation, the error summary, the conditional reveal (it just shows unconditionally)
  and a confirmation. JavaScript only *enhances*, moving focus to the error summary and collapsing the
  reveal. There is an e2e test that drives the entire journey with `javaScriptEnabled: false` to keep
  that honest.
- **Accessible error handling.** Submitting with mistakes returns `400` with an error summary that
  takes focus, inline messages, and `Error:` in the page title. The three-field date input names which
  part is wrong ("must include a month") and highlights only that field, the fiddly bit the Design
  System's own guidance spends the most words on.
- **One source of truth for the journey.** Step order, the option lists and "is this application
  complete?" live in one plain-data module ([`src/journey.ts`](src/journey.ts)) with no Express or
  Nunjucks in it, which is what lets the model be unit-tested without a server.
- **Check-your-answers done properly.** "Change" links carry the user back to a question and then
  *return them to check-answers* rather than restarting the linear flow; jumping ahead to
  check-answers (or confirmation) with an unfinished application bounces back to the first gap.
- **Server-side validation only.** `novalidate` turns off the browser's HTML5 validation so the
  server is the single gate; the validators ([`src/validation.ts`](src/validation.ts)) are pure and
  carry both the inline message and the error-summary focus target.

## Accessibility and testing

- **Unit** (Vitest): every validator branch and every journey helper.
- **End-to-end** (Playwright): the happy path, the change round-trip, the resume guard, a missing
  answer (error summary takes focus), and the full journey with JavaScript disabled.
- **Automated accessibility** (axe, via Playwright): every page (start, each question, the error
  state, check-answers, confirmation, the accessibility statement and the 404), asserted against WCAG
  2.1 A and AA.

One axe rule is filtered, precisely and on purpose: GOV.UK Frontend's conditional reveal adds
`aria-expanded` to the controlling radio, which axe flags as `aria-allowed-attr` because the ARIA spec
does not list that attribute for `role="radio"`. It is a
[deliberate, documented GOV.UK decision](https://github.com/alphagov/govuk-frontend/issues/979) that
ships on real services, not a barrier; the filter in
[`e2e/accessibility.spec.ts`](e2e/accessibility.spec.ts) drops only that exact finding, so anything
else still fails the build. Automated testing catches a lot but not everything; it is no substitute
for testing with disabled users.

## Branding, the honest bit

The GOV.UK Design System is open source and built for reuse; the **GOV.UK brand** is not. The Crown,
the GOV.UK logotype, the Open Government Licence and Crown copyright are reserved for live government
services on gov.uk, and the Design System's `govukHeader` / `govukFooter` hardcode them. So this demo
uses the Design System in full but swaps in a neutral service header and an honest footer, and a
`Prototype` phase banner states plainly that it is not a real service. Knowing where that line sits is
part of building for government.

## Tech

TypeScript, [Express 5](https://expressjs.com/), [Nunjucks](https://mozilla.github.io/nunjucks/) and
[`govuk-frontend`](https://www.npmjs.com/package/govuk-frontend) 6. Sessions hold the in-progress
application; a real deployment would set `SESSION_SECRET` and swap the in-memory store for a shared
one (e.g. connect-redis). The reference number on the confirmation page is random (a receipt, not a
key) because there is no datastore behind the demo.

## Project layout

```
src/
  journey.ts      the steps, the option lists, "is it complete?": plain data, no framework
  validation.ts   pure validators: the cleaned value + errors (message + focus target)
  routes.ts       GET render / POST validate-redirect for each step; the change + resume logic
  app.ts          Nunjucks + GOV.UK Frontend wiring, static assets, sessions (the composition root)
  views/*.njk     one template per page, extending the GOV.UK page template
test/             unit tests (Vitest)
e2e/              Playwright: journey.spec.ts (incl. no-JS), accessibility.spec.ts (axe)
```

## Licence

[MIT](LICENSE) © Raby Whyte. Uses GOV.UK Frontend (© Crown copyright, MIT).
