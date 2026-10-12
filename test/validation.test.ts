import { describe, it, expect } from 'vitest'
import {
  validateName,
  validateReserve,
  validateSpecies,
  validateStartDate,
} from '../src/validation.js'

// A fixed "today" so the date rules are deterministic: Monday 12 October 2026.
const TODAY = new Date(2026, 9, 12)

describe('validateName', () => {
  it('rejects an empty or whitespace name', () => {
    expect(validateName('').errors[0]?.message).toBe('Enter your full name')
    expect(validateName('   ').errors).toHaveLength(1)
    expect(validateName(undefined).errors).toHaveLength(1)
  })

  it('trims and accepts a real name', () => {
    const r = validateName('  Alex Finch  ')
    expect(r.errors).toHaveLength(0)
    expect(r.value).toBe('Alex Finch')
  })

  it('rejects an over-long name', () => {
    const r = validateName('a'.repeat(256))
    expect(r.value).toBeUndefined()
    expect(r.errors[0]?.message).toMatch(/255 characters or fewer/)
  })
})

describe('validateSpecies', () => {
  it('rejects nothing selected or an unknown id', () => {
    expect(validateSpecies(undefined, undefined).errors[0]?.message).toBe('Select the species you intend to ring')
    expect(validateSpecies('pelican', undefined).errors).toHaveLength(1)
  })

  it('accepts a known species', () => {
    const r = validateSpecies('kingfisher', undefined)
    expect(r.errors).toHaveLength(0)
    expect(r.value).toEqual({ speciesId: 'kingfisher' })
  })

  it('requires the free-text name when "other" is chosen', () => {
    const r = validateSpecies('other', '  ')
    expect(r.value).toBeUndefined()
    expect(r.errors[0]).toMatchObject({ field: 'other-species', href: '#other-species' })
  })

  it('accepts "other" with a name, trimmed', () => {
    const r = validateSpecies('other', '  Chiffchaff ')
    expect(r.value).toEqual({ speciesId: 'other', otherSpecies: 'Chiffchaff' })
  })
})

describe('validateReserve', () => {
  it('rejects nothing / unknown and accepts a known reserve', () => {
    expect(validateReserve(undefined).errors).toHaveLength(1)
    expect(validateReserve('narnia').errors).toHaveLength(1)
    expect(validateReserve('minsmere').value).toBe('minsmere')
  })
})

describe('validateStartDate', () => {
  it('asks for the whole date when every field is empty', () => {
    const r = validateStartDate({}, TODAY)
    expect(r.errors[0]?.message).toBe('Enter the date you plan to start ringing')
    expect(r.erroredParts).toEqual({ day: true, month: true, year: true })
    expect(r.errors[0]?.href).toBe('#start-date-day')
  })

  it('names the single missing field and highlights only it', () => {
    const r = validateStartDate({ day: '5', month: '', year: '2027' }, TODAY)
    expect(r.errors[0]?.message).toBe('The date you plan to start ringing must include a month')
    expect(r.erroredParts).toEqual({ day: false, month: true, year: false })
    expect(r.errors[0]?.href).toBe('#start-date-month')
  })

  it('names two missing fields with "and"', () => {
    const r = validateStartDate({ day: '', month: '3', year: '' }, TODAY)
    expect(r.errors[0]?.message).toBe('The date you plan to start ringing must include a day and year')
    expect(r.erroredParts).toEqual({ day: true, month: false, year: true })
  })

  it('rejects non-numeric parts as not a real date, highlighting the bad part', () => {
    const r = validateStartDate({ day: 'x', month: '3', year: '2027' }, TODAY)
    expect(r.errors[0]?.message).toBe('The date you plan to start ringing must be a real date')
    expect(r.erroredParts).toEqual({ day: true, month: false, year: false })
  })

  it('rejects an impossible calendar date (31 February)', () => {
    const r = validateStartDate({ day: '31', month: '2', year: '2027' }, TODAY)
    expect(r.errors[0]?.message).toBe('The date you plan to start ringing must be a real date')
  })

  it('rejects a two-digit year as not a real date', () => {
    const r = validateStartDate({ day: '5', month: '3', year: '27' }, TODAY)
    expect(r.errors[0]?.message).toBe('The date you plan to start ringing must be a real date')
    expect(r.erroredParts.year).toBe(true)
  })

  it('rejects a date in the past', () => {
    const r = validateStartDate({ day: '1', month: '1', year: '2020' }, TODAY)
    expect(r.errors[0]?.message).toBe('The date you plan to start ringing must be today or in the future')
  })

  it('accepts today itself', () => {
    const r = validateStartDate({ day: '12', month: '10', year: '2026' }, TODAY)
    expect(r.errors).toHaveLength(0)
    expect(r.value?.iso).toBe('2026-10-12')
  })

  it('accepts a future date and normalises the ISO value', () => {
    const r = validateStartDate({ day: '5', month: '11', year: '2027' }, TODAY)
    expect(r.errors).toHaveLength(0)
    expect(r.value).toMatchObject({ day: '5', month: '11', year: '2027', iso: '2027-11-05' })
  })
})
