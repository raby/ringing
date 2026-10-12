// The journey routes. Every question is a GET (render) plus a POST (validate → save → redirect),
// the classic POST-redirect-GET so a refresh never re-submits. Nothing here needs JavaScript: each
// form posts to the server, which is the whole progressive-enhancement claim.
//
// Two GDS details worth naming:
//   - the change round-trip — a "Change" link on check-answers carries `?return=check-answers`, and a
//     successful edit returns there instead of ploughing on through the linear flow;
//   - the resume guard — jumping straight to check-answers (or confirmation) with an unfinished
//     application bounces you back to the first unanswered question.

import type { Express, Request, Response } from 'express'
import {
  CHECK_ANSWERS_PATH,
  OTHER_SPECIES,
  RESERVES,
  SPECIES,
  STEPS,
  type ApplicationDraft,
  type SubmittedApplication,
  firstIncompletePath,
  formatDate,
  isComplete,
  nextPath,
  reserveLabel,
  speciesLabel,
} from './journey.js'
import { generateReference } from './reference.js'
import {
  type FieldError,
  validateName,
  validateReserve,
  validateSpecies,
  validateStartDate,
} from './validation.js'

/** Read a string form/query value without tripping over Express's `any`-typed body. */
function readString(source: unknown, key: string): string | undefined {
  if (source && typeof source === 'object' && key in source) {
    const value = (source as Record<string, unknown>)[key]
    if (typeof value === 'string') return value
  }
  return undefined
}

/** One message per field, for the inline error on each component. */
function toErrorMap(errors: readonly FieldError[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const e of errors) if (!(e.field in map)) map[e.field] = e.message
  return map
}

function stepTitle(id: string): string {
  return STEPS.find((s) => s.id === id)?.title ?? ''
}

function draftOf(req: Request): ApplicationDraft {
  return req.session.application ?? {}
}

function returnToOf(source: unknown, key: string): '' | 'check-answers' {
  return readString(source, key) === 'check-answers' ? 'check-answers' : ''
}

/** Where "Back" goes: to check-answers mid-edit, otherwise to the previous step (or the start page). */
function backFor(stepId: string, returnTo: string): string {
  if (returnTo === 'check-answers') return CHECK_ANSWERS_PATH
  const i = STEPS.findIndex((s) => s.id === stepId)
  return i <= 0 ? '/' : (STEPS[i - 1]?.path ?? '/')
}

function destinationAfter(stepId: string, returnTo: string): string {
  return returnTo === 'check-answers' ? CHECK_ANSWERS_PATH : nextPath(stepId)
}

export function registerRoutes(app: Express): void {
  app.get('/', (_req, res) => {
    res.render('start', {})
  })

  // Step 1 — full name (text input).
  app.get('/applicant-name', (req, res) => {
    const returnTo = returnToOf(req.query, 'return')
    res.render('applicant-name', {
      title: stepTitle('applicant-name'),
      value: draftOf(req).applicantName ?? '',
      returnTo,
      backPath: backFor('applicant-name', returnTo),
    })
  })

  app.post('/applicant-name', (req, res) => {
    const returnTo = returnToOf(req.body, 'returnTo')
    const raw = readString(req.body, 'applicant-name')
    const { value, errors } = validateName(raw)
    if (errors.length || value === undefined) {
      res.status(400).render('applicant-name', {
        title: stepTitle('applicant-name'),
        value: raw ?? '',
        errors,
        errorMap: toErrorMap(errors),
        returnTo,
        backPath: backFor('applicant-name', returnTo),
      })
      return
    }
    req.session.application = { ...draftOf(req), applicantName: value }
    res.redirect(303, destinationAfter('applicant-name', returnTo))
  })

  // Step 2 — species (radios with an "other" conditional reveal).
  app.get('/species', (req, res) => {
    const returnTo = returnToOf(req.query, 'return')
    const draft = draftOf(req)
    res.render('species', {
      title: stepTitle('species'),
      species: SPECIES,
      otherId: OTHER_SPECIES,
      selected: draft.speciesId ?? '',
      otherValue: draft.otherSpecies ?? '',
      returnTo,
      backPath: backFor('species', returnTo),
    })
  })

  app.post('/species', (req, res) => {
    const returnTo = returnToOf(req.body, 'returnTo')
    const choice = readString(req.body, 'species')
    const other = readString(req.body, 'other-species')
    const { value, errors } = validateSpecies(choice, other)
    if (errors.length || value === undefined) {
      res.status(400).render('species', {
        title: stepTitle('species'),
        species: SPECIES,
        otherId: OTHER_SPECIES,
        selected: choice ?? '',
        otherValue: other ?? '',
        errors,
        errorMap: toErrorMap(errors),
        returnTo,
        backPath: backFor('species', returnTo),
      })
      return
    }
    const application: ApplicationDraft = { ...draftOf(req), speciesId: value.speciesId }
    if (value.otherSpecies !== undefined) application.otherSpecies = value.otherSpecies
    else delete application.otherSpecies
    req.session.application = application
    res.redirect(303, destinationAfter('species', returnTo))
  })

  // Step 3 — reserve (radios).
  app.get('/reserve', (req, res) => {
    const returnTo = returnToOf(req.query, 'return')
    res.render('reserve', {
      title: stepTitle('reserve'),
      reserves: RESERVES,
      selected: draftOf(req).reserveId ?? '',
      returnTo,
      backPath: backFor('reserve', returnTo),
    })
  })

  app.post('/reserve', (req, res) => {
    const returnTo = returnToOf(req.body, 'returnTo')
    const choice = readString(req.body, 'reserve')
    const { value, errors } = validateReserve(choice)
    if (errors.length || value === undefined) {
      res.status(400).render('reserve', {
        title: stepTitle('reserve'),
        reserves: RESERVES,
        selected: choice ?? '',
        errors,
        errorMap: toErrorMap(errors),
        returnTo,
        backPath: backFor('reserve', returnTo),
      })
      return
    }
    req.session.application = { ...draftOf(req), reserveId: value }
    res.redirect(303, destinationAfter('reserve', returnTo))
  })

  // Step 4 — start date (three-field date input).
  app.get('/start-date', (req, res) => {
    const returnTo = returnToOf(req.query, 'return')
    const date = draftOf(req).startDate
    res.render('start-date', {
      title: stepTitle('start-date'),
      day: date?.day ?? '',
      month: date?.month ?? '',
      year: date?.year ?? '',
      erroredParts: { day: false, month: false, year: false },
      returnTo,
      backPath: backFor('start-date', returnTo),
    })
  })

  app.post('/start-date', (req, res) => {
    const returnTo = returnToOf(req.body, 'returnTo')
    const raw = {
      day: readString(req.body, 'start-date-day'),
      month: readString(req.body, 'start-date-month'),
      year: readString(req.body, 'start-date-year'),
    }
    const { value, errors, erroredParts } = validateStartDate(raw, new Date())
    if (errors.length || value === undefined) {
      res.status(400).render('start-date', {
        title: stepTitle('start-date'),
        day: raw.day ?? '',
        month: raw.month ?? '',
        year: raw.year ?? '',
        erroredParts,
        errors,
        errorMap: toErrorMap(errors),
        returnTo,
        backPath: backFor('start-date', returnTo),
      })
      return
    }
    req.session.application = { ...draftOf(req), startDate: value }
    res.redirect(303, destinationAfter('start-date', returnTo))
  })

  // Check your answers.
  app.get('/check-answers', (req, res) => {
    const draft = draftOf(req)
    if (!isComplete(draft)) {
      res.redirect(303, firstIncompletePath(draft))
      return
    }
    res.render('check-answers', {
      title: 'Check your answers before sending your application',
      answers: summaryAnswers(draft),
    })
  })

  app.post('/check-answers', (req, res) => {
    const draft = draftOf(req)
    // Defensive: never mint a reference for a half-finished application, even if the POST is forged.
    if (!isComplete(draft)) {
      res.redirect(303, firstIncompletePath(draft))
      return
    }
    const submission: SubmittedApplication = {
      applicantName: draft.applicantName!,
      speciesId: draft.speciesId!,
      reserveId: draft.reserveId!,
      startDate: draft.startDate!,
      reference: generateReference(),
      ...(draft.otherSpecies !== undefined ? { otherSpecies: draft.otherSpecies } : {}),
    }
    req.session.submission = submission
    delete req.session.application
    res.redirect(303, '/confirmation')
  })

  app.get('/confirmation', (req, res) => {
    const submission = req.session.submission
    if (!submission) {
      res.redirect(303, '/')
      return
    }
    res.render('confirmation', { title: 'Application submitted', reference: submission.reference })
  })

  // Every GOV.UK service must publish an accessibility statement — so the demo carries one too.
  app.get('/accessibility', (_req, res) => {
    res.render('accessibility', { title: 'Accessibility statement' })
  })

  // Standard GOV.UK error pages.
  app.use((_req, res) => {
    res.status(404).render('not-found', { title: 'Page not found' })
  })
  app.use((err: unknown, _req: Request, res: Response, _next: (e?: unknown) => void) => {
    console.error(err)
    res.status(500).render('problem', { title: 'Sorry, there is a problem with the service' })
  })
}

interface SummaryAnswer {
  readonly key: string
  readonly value: string
  readonly changeHref: string
  readonly changeHidden: string
}

function summaryAnswers(draft: ApplicationDraft): SummaryAnswer[] {
  const r = (path: string): string => `${path}?return=check-answers`
  return [
    { key: 'Full name', value: draft.applicantName ?? '', changeHref: r('/applicant-name'), changeHidden: 'full name' },
    { key: 'Species', value: speciesLabel(draft), changeHref: r('/species'), changeHidden: 'species' },
    { key: 'Reserve', value: reserveLabel(draft), changeHref: r('/reserve'), changeHidden: 'reserve' },
    {
      key: 'Start date',
      value: draft.startDate ? formatDate(draft.startDate.iso) : '',
      changeHref: r('/start-date'),
      changeHidden: 'start date',
    },
  ]
}
