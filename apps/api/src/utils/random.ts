/**
 * Cryptographically secure random utilities for the API.
 * Uses Web Crypto API available in Cloudflare Workers.
 */

/** Returns a secure random string of specified length using base36 characters */
export function secureRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[array[i]! % chars.length]
  }
  return result
}
