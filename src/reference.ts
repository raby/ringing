// A human-friendly receipt number for the confirmation page, e.g. RNG-7KP4-QW9M. The alphabet drops
// the glyphs people confuse when reading a reference back over the phone (0/O, 1/I), which is the
// GDS reason for Crockford-style alphabets. `rand` is injectable so the format can be unit-tested.
//
// This is a receipt, not a key: a real service would mint the reference from a persisted, collision-
// checked sequence. Here it is random, because there is no datastore behind the demo.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateReference(rand: () => number = Math.random): string {
  const block = (): string =>
    Array.from({ length: 4 }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]).join('')
  return `RNG-${block()}-${block()}`
}
