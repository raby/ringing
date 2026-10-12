import { describe, it, expect } from 'vitest'
import { generateReference } from '../src/reference.js'

describe('generateReference', () => {
  it('has the shape RNG-XXXX-XXXX from the unambiguous alphabet', () => {
    expect(generateReference()).toMatch(/^RNG-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/)
  })

  it('is deterministic given the random source', () => {
    expect(generateReference(() => 0)).toBe('RNG-AAAA-AAAA')
  })

  it('never emits the confusable glyphs 0, O, 1 or I', () => {
    // Drive the index across the whole alphabet; none of the eight characters may be a confusable.
    for (const r of [0, 0.25, 0.5, 0.75, 0.999999]) {
      expect(generateReference(() => r)).not.toMatch(/[01OI]/)
    }
  })
})
