import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { secureRandom, secureRandomInt, secureRandomString } from './random'

describe('secureRandom', () => {
  it('returns a number between 0 and 1', () => {
    for (let i = 0; i < 100; i++) {
      const result = secureRandom()
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(1)
    }
  })

  it('produces different values on successive calls', () => {
    const values = new Set<number>()
    for (let i = 0; i < 10; i++) {
      values.add(secureRandom())
    }
    // With high probability, we should get at least 5 different values
    expect(values.size).toBeGreaterThanOrEqual(5)
  })
})

describe('secureRandomInt', () => {
  it('returns integers within the specified range', () => {
    for (let i = 0; i < 100; i++) {
      const result = secureRandomInt(5, 10)
      expect(result).toBeGreaterThanOrEqual(5)
      expect(result).toBeLessThan(10)
      expect(Number.isInteger(result)).toBe(true)
    }
  })

  it('works with negative ranges', () => {
    for (let i = 0; i < 50; i++) {
      const result = secureRandomInt(-10, -5)
      expect(result).toBeGreaterThanOrEqual(-10)
      expect(result).toBeLessThan(-5)
    }
  })

  it('returns min when range is 1', () => {
    const result = secureRandomInt(7, 8)
    expect(result).toBe(7)
  })

  it('works with zero in range', () => {
    for (let i = 0; i < 50; i++) {
      const result = secureRandomInt(-5, 5)
      expect(result).toBeGreaterThanOrEqual(-5)
      expect(result).toBeLessThan(5)
    }
  })
})

describe('secureRandomString', () => {
  it('returns string of correct length', () => {
    expect(secureRandomString(10)).toHaveLength(10)
    expect(secureRandomString(0)).toHaveLength(0)
    expect(secureRandomString(50)).toHaveLength(50)
  })

  it('contains only allowed characters', () => {
    const allowedChars = /^[a-z0-9]*$/
    for (let i = 0; i < 20; i++) {
      const result = secureRandomString(20)
      expect(result).toMatch(allowedChars)
    }
  })

  it('produces different strings', () => {
    const strings = new Set<string>()
    for (let i = 0; i < 10; i++) {
      strings.add(secureRandomString(10))
    }
    // With high probability, all strings should be unique
    expect(strings.size).toBe(10)
  })

  it('returns empty string for length 0', () => {
    expect(secureRandomString(0)).toBe('')
  })
})
