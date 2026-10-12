import { describe, it, expect } from 'vitest'
import {
  type ApplicationDraft,
  firstIncompletePath,
  formatDate,
  isComplete,
  nextPath,
  reserveLabel,
  speciesLabel,
} from '../src/journey.js'

const complete: ApplicationDraft = {
  applicantName: 'Alex Finch',
  speciesId: 'kingfisher',
  reserveId: 'minsmere',
  startDate: { day: '5', month: '11', year: '2027', iso: '2027-11-05' },
}

describe('nextPath', () => {
  it('steps through the journey and ends at check-answers', () => {
    expect(nextPath('applicant-name')).toBe('/species')
    expect(nextPath('species')).toBe('/reserve')
    expect(nextPath('reserve')).toBe('/start-date')
    expect(nextPath('start-date')).toBe('/check-answers')
  })
})

describe('isComplete', () => {
  it('is true only when every step is answered', () => {
    expect(isComplete(complete)).toBe(true)
    expect(isComplete({})).toBe(false)
    const { reserveId: _omit, ...missingReserve } = complete
    expect(isComplete(missingReserve)).toBe(false)
  })

  it('requires the free-text name when species is "other"', () => {
    expect(isComplete({ ...complete, speciesId: 'other' })).toBe(false)
    expect(isComplete({ ...complete, speciesId: 'other', otherSpecies: 'Chiffchaff' })).toBe(true)
  })
})

describe('firstIncompletePath', () => {
  it('points at the first unanswered step', () => {
    expect(firstIncompletePath({})).toBe('/applicant-name')
    expect(firstIncompletePath({ applicantName: 'Alex Finch' })).toBe('/species')
    const { reserveId: _omit, ...missingReserve } = complete
    expect(firstIncompletePath(missingReserve)).toBe('/reserve')
    expect(firstIncompletePath(complete)).toBe('/check-answers')
  })
})

describe('labels', () => {
  it('resolves a known species and the "other" free text', () => {
    expect(speciesLabel({ speciesId: 'kingfisher' })).toBe('Kingfisher')
    expect(speciesLabel({ speciesId: 'other', otherSpecies: 'Chiffchaff' })).toBe('Chiffchaff')
    expect(speciesLabel({})).toBe('')
  })

  it('resolves a reserve as "name, region"', () => {
    expect(reserveLabel({ reserveId: 'minsmere' })).toBe('Minsmere, Suffolk')
    expect(reserveLabel({})).toBe('')
  })
})

describe('formatDate', () => {
  it('renders an ISO date the way GOV.UK writes dates', () => {
    expect(formatDate('2027-11-05')).toBe('5 November 2027')
    expect(formatDate('2026-01-01')).toBe('1 January 2026')
  })
})
