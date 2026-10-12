// The journey — the single source of truth for what the service asks, in what order, and what a
// completed application looks like. Routes and views read from here; nothing hard-codes the step
// order or the option lists twice. Keeping it as plain data (no Express, no Nunjucks) is what lets
// the whole journey model be unit-tested without a server.

export interface Species {
  readonly id: string
  readonly name: string
  readonly scientificName: string
}

export interface Reserve {
  readonly id: string
  readonly name: string
  readonly region: string
}

/**
 * A handful of Schedule 1 species (Wildlife and Countryside Act 1981) — the ones whose ringing needs
 * a specific permit endorsement. The reserves are the same four that bird-platform seeds, so the two
 * portfolio pieces describe one coherent domain.
 */
export const SPECIES: readonly Species[] = [
  { id: 'kingfisher', name: 'Kingfisher', scientificName: 'Alcedo atthis' },
  { id: 'barn-owl', name: 'Barn owl', scientificName: 'Tyto alba' },
  { id: 'peregrine', name: 'Peregrine falcon', scientificName: 'Falco peregrinus' },
  { id: 'dartford-warbler', name: 'Dartford warbler', scientificName: 'Curruca undata' },
  { id: 'bearded-tit', name: 'Bearded tit', scientificName: 'Panurus biarmicus' },
]

/** Sentinel id for the "another species" radio, which reveals a free-text field. */
export const OTHER_SPECIES = 'other'

export const RESERVES: readonly Reserve[] = [
  { id: 'leighton-moss', name: 'Leighton Moss', region: 'Lancashire' },
  { id: 'loch-garten', name: 'Loch Garten', region: 'Highland' },
  { id: 'ham-wall', name: 'Ham Wall', region: 'Somerset' },
  { id: 'minsmere', name: 'Minsmere', region: 'Suffolk' },
]

export interface StartDate {
  readonly day: string
  readonly month: string
  readonly year: string
  /** ISO yyyy-mm-dd, set once the parts parse to a real date. */
  readonly iso: string
}

/** The answers collected so far. Every field is optional because the journey is filled incrementally. */
export interface ApplicationDraft {
  applicantName?: string
  speciesId?: string
  otherSpecies?: string
  reserveId?: string
  startDate?: StartDate
}

/** A draft that has cleared validation and been given a reference — what the confirmation page shows. */
export interface SubmittedApplication {
  readonly applicantName: string
  readonly speciesId: string
  readonly otherSpecies?: string
  readonly reserveId: string
  readonly startDate: StartDate
  readonly reference: string
}

export interface Step {
  readonly id: string
  readonly path: string
  /** Page heading, reused as the summary-list row key on the check-answers page. */
  readonly title: string
}

export const STEPS: readonly Step[] = [
  { id: 'applicant-name', path: '/applicant-name', title: 'What is your full name?' },
  { id: 'species', path: '/species', title: 'Which species do you intend to ring?' },
  { id: 'reserve', path: '/reserve', title: 'At which reserve will you be ringing?' },
  { id: 'start-date', path: '/start-date', title: 'When do you plan to start?' },
]

export const CHECK_ANSWERS_PATH = '/check-answers'

/** The path of the step after `stepId`, or the check-answers page if it was the last one. */
export function nextPath(stepId: string): string {
  const i = STEPS.findIndex((s) => s.id === stepId)
  const next = STEPS[i + 1]
  return next ? next.path : CHECK_ANSWERS_PATH
}

/** Is a single step answered? Used both to guard check-answers and to find where to resume. */
export function isStepComplete(draft: ApplicationDraft, stepId: string): boolean {
  switch (stepId) {
    case 'applicant-name':
      return !!draft.applicantName
    case 'species':
      return draft.speciesId === OTHER_SPECIES ? !!draft.otherSpecies : !!draft.speciesId
    case 'reserve':
      return !!draft.reserveId
    case 'start-date':
      return !!draft.startDate
    default:
      return false
  }
}

export function isComplete(draft: ApplicationDraft): boolean {
  return STEPS.every((s) => isStepComplete(draft, s.id))
}

/** The first unanswered step — so a user who jumps to check-answers is sent back to finish, GDS-style. */
export function firstIncompletePath(draft: ApplicationDraft): string {
  const step = STEPS.find((s) => !isStepComplete(draft, s.id))
  return step ? step.path : CHECK_ANSWERS_PATH
}

export function speciesById(id: string | undefined): Species | undefined {
  return SPECIES.find((s) => s.id === id)
}

export function reserveById(id: string | undefined): Reserve | undefined {
  return RESERVES.find((r) => r.id === id)
}

/** The human-readable species answer, resolving the "other" free-text case. */
export function speciesLabel(draft: ApplicationDraft): string {
  if (draft.speciesId === OTHER_SPECIES) return draft.otherSpecies ?? ''
  return speciesById(draft.speciesId)?.name ?? ''
}

export function reserveLabel(draft: ApplicationDraft): string {
  const r = reserveById(draft.reserveId)
  return r ? `${r.name}, ${r.region}` : ''
}

/** Format an ISO date as GOV.UK renders dates in prose, e.g. "5 November 2026". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return `${d} ${months[m - 1]} ${y}`
}
