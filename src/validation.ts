// Validation — pure functions, no Express. Each validator takes the raw submitted strings and returns
// the cleaned value (when valid) plus a flat list of errors. The error shape carries everything the
// views need: `field` for the inline message, `href` for the error-summary link that moves focus to
// the offending input. Keeping this server-side is the point — the journey must validate with
// JavaScript switched off, so the browser's own HTML5 validation is deliberately suppressed
// (`novalidate`) and this is the only gate.

import { OTHER_SPECIES, RESERVES, SPECIES, type StartDate } from './journey.js'

export interface FieldError {
  /** The form field this belongs to, so a view can find its own inline message. */
  readonly field: string
  /** Fragment id of the input to focus when the error-summary link is followed. */
  readonly href: string
  /** Shown both inline and in the error summary — GDS keeps the two wordings identical. */
  readonly message: string
}

export interface ValidationResult<T> {
  readonly value?: T
  readonly errors: readonly FieldError[]
}

const MAX_TEXT = 255

export function validateName(raw: string | undefined): ValidationResult<string> {
  const value = (raw ?? '').trim()
  if (value === '') {
    return { errors: [{ field: 'applicant-name', href: '#applicant-name', message: 'Enter your full name' }] }
  }
  if (value.length > MAX_TEXT) {
    return {
      errors: [{ field: 'applicant-name', href: '#applicant-name', message: `Full name must be ${MAX_TEXT} characters or fewer` }],
    }
  }
  return { value, errors: [] }
}

export interface SpeciesAnswer {
  readonly speciesId: string
  readonly otherSpecies?: string
}

export function validateSpecies(choice: string | undefined, other: string | undefined): ValidationResult<SpeciesAnswer> {
  const selected = (choice ?? '').trim()
  const known = new Set<string>([...SPECIES.map((s) => s.id), OTHER_SPECIES])
  if (!known.has(selected)) {
    return { errors: [{ field: 'species', href: '#species', message: 'Select the species you intend to ring' }] }
  }
  if (selected === OTHER_SPECIES) {
    const otherValue = (other ?? '').trim()
    if (otherValue === '') {
      return {
        errors: [{ field: 'other-species', href: '#other-species', message: 'Enter the name of the species you intend to ring' }],
      }
    }
    if (otherValue.length > MAX_TEXT) {
      return {
        errors: [{ field: 'other-species', href: '#other-species', message: `Species name must be ${MAX_TEXT} characters or fewer` }],
      }
    }
    return { value: { speciesId: OTHER_SPECIES, otherSpecies: otherValue }, errors: [] }
  }
  return { value: { speciesId: selected }, errors: [] }
}

export function validateReserve(choice: string | undefined): ValidationResult<string> {
  const selected = (choice ?? '').trim()
  const known = new Set<string>(RESERVES.map((r) => r.id))
  if (!known.has(selected)) {
    return { errors: [{ field: 'reserve', href: '#reserve', message: 'Select the reserve where you will be ringing' }] }
  }
  return { value: selected, errors: [] }
}

export interface RawDate {
  // Explicitly `| undefined`: under exactOptionalPropertyTypes the raw parts arrive straight from the
  // request and really may be missing, so the caller must be free to pass undefined.
  readonly day?: string | undefined
  readonly month?: string | undefined
  readonly year?: string | undefined
}

/** Which of the three date parts to highlight — the date-input macro adds the error class per part. */
export interface DatePartErrors {
  readonly day: boolean
  readonly month: boolean
  readonly year: boolean
}

export interface DateValidationResult extends ValidationResult<StartDate> {
  readonly erroredParts: DatePartErrors
}

const DATE_SUBJECT = 'the date you plan to start ringing'
const ALL_PARTS: DatePartErrors = { day: true, month: true, year: true }
const NO_PARTS: DatePartErrors = { day: false, month: false, year: false }

function dateError(message: string, erroredParts: DatePartErrors, focus: 'day' | 'month' | 'year'): DateValidationResult {
  return { errors: [{ field: 'start-date', href: `#start-date-${focus}`, message }], erroredParts }
}

/**
 * Validate a GOV.UK three-field date, following the Design System's own rules for which field to
 * highlight and which message to show — the order matters: missing parts are reported before a
 * malformed date, which is reported before a date that is simply out of range.
 *
 * `today` is injected so the "today or in the future" rule is deterministic under test.
 */
export function validateStartDate(raw: RawDate, today: Date): DateValidationResult {
  const day = (raw.day ?? '').trim()
  const month = (raw.month ?? '').trim()
  const year = (raw.year ?? '').trim()

  const present = { day: day !== '', month: month !== '', year: year !== '' }

  if (!present.day && !present.month && !present.year) {
    return dateError(`Enter ${DATE_SUBJECT}`, ALL_PARTS, 'day')
  }

  // Some but not all fields filled: name the missing ones, highlight only those.
  if (!present.day || !present.month || !present.year) {
    const missing: Array<'day' | 'month' | 'year'> = []
    if (!present.day) missing.push('day')
    if (!present.month) missing.push('month')
    if (!present.year) missing.push('year')
    const list = missing.length === 2 ? `${missing[0]} and ${missing[1]}` : missing.join(', ')
    return dateError(
      `${capitalise(DATE_SUBJECT)} must include a ${list}`,
      { day: !present.day, month: !present.month, year: !present.year },
      missing[0]!,
    )
  }

  // All three present. Check each part is digits-only and in gross range.
  const dayOk = /^\d+$/.test(day) && +day >= 1 && +day <= 31
  const monthOk = /^\d+$/.test(month) && +month >= 1 && +month <= 12
  const yearOk = /^\d{4}$/.test(year)
  if (!dayOk || !monthOk || !yearOk) {
    // Highlight the specific malformed parts if we can pin them down, otherwise all three.
    const parts: DatePartErrors = { day: !dayOk, month: !monthOk, year: !yearOk }
    return dateError(`${capitalise(DATE_SUBJECT)} must be a real date`, parts, firstErrored(parts))
  }

  // Parts are individually sane — reject impossible combinations (e.g. 31 February) by round-trip.
  const d = +day
  const m = +month
  const y = +year
  const candidate = new Date(y, m - 1, d)
  const realDate = candidate.getFullYear() === y && candidate.getMonth() === m - 1 && candidate.getDate() === d
  if (!realDate) {
    return dateError(`${capitalise(DATE_SUBJECT)} must be a real date`, ALL_PARTS, 'day')
  }

  // Compare date-only (strip the clock) so "today" always passes.
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (candidate.getTime() < todayMidnight.getTime()) {
    return dateError(`${capitalise(DATE_SUBJECT)} must be today or in the future`, ALL_PARTS, 'day')
  }

  const iso = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return { value: { day, month, year, iso }, erroredParts: NO_PARTS, errors: [] }
}

function firstErrored(parts: DatePartErrors): 'day' | 'month' | 'year' {
  if (parts.day) return 'day'
  if (parts.month) return 'month'
  return 'year'
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
