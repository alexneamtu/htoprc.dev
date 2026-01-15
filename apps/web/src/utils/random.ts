/**
 * Cryptographically secure random number generator.
 * Uses Web Crypto API instead of Math.random().
 */

/** Returns a secure random number between 0 (inclusive) and 1 (exclusive) */
export function secureRandom(): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0]! / (0xffffffff + 1)
}

/** Returns a secure random integer between min (inclusive) and max (exclusive) */
export function secureRandomInt(min: number, max: number): number {
  return Math.floor(secureRandom() * (max - min)) + min
}

/** Returns a secure random string of specified length */
export function secureRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[secureRandomInt(0, chars.length)]
  }
  return result
}
