import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  verifyClerkToken,
  getAuthFromRequest,
  getAnonKeyFromRequest,
  isUserAdmin,
  isUserTrusted,
} from './auth'

describe('verifyClerkToken', () => {
  it('returns null when token verification fails', async () => {
    const result = await verifyClerkToken('invalid-token', 'secret')
    expect(result).toBeNull()
  })
})

describe('getAuthFromRequest', () => {
  it('returns null when no authorization header present', async () => {
    const request = new Request('https://example.com', {
      headers: {},
    })
    const result = await getAuthFromRequest(request, 'secret')
    expect(result).toBeNull()
  })

  it('returns null when authorization header is not Bearer format', async () => {
    const request = new Request('https://example.com', {
      headers: { authorization: 'Basic abc123' },
    })
    const result = await getAuthFromRequest(request, 'secret')
    expect(result).toBeNull()
  })

  it('returns null when no secret key provided', async () => {
    const request = new Request('https://example.com', {
      headers: { authorization: 'Bearer token123' },
    })
    const result = await getAuthFromRequest(request, undefined)
    expect(result).toBeNull()
  })

  it('uses custom verifier when provided', async () => {
    const mockVerifier = vi.fn().mockResolvedValue({ userId: 'user-123' })
    const request = new Request('https://example.com', {
      headers: { authorization: 'Bearer valid-token' },
    })
    const result = await getAuthFromRequest(request, 'secret', mockVerifier)

    expect(mockVerifier).toHaveBeenCalledWith('valid-token', 'secret')
    expect(result).toEqual({ userId: 'user-123' })
  })

  it('extracts token from Bearer header case-insensitively', async () => {
    const mockVerifier = vi.fn().mockResolvedValue({ userId: 'user-123' })
    const request = new Request('https://example.com', {
      headers: { authorization: 'bearer valid-token' },
    })
    await getAuthFromRequest(request, 'secret', mockVerifier)

    expect(mockVerifier).toHaveBeenCalledWith('valid-token', 'secret')
  })

  it('trims whitespace from token', async () => {
    const mockVerifier = vi.fn().mockResolvedValue({ userId: 'user-123' })
    const request = new Request('https://example.com', {
      headers: { authorization: 'Bearer   token-with-spaces   ' },
    })
    await getAuthFromRequest(request, 'secret', mockVerifier)

    expect(mockVerifier).toHaveBeenCalledWith('token-with-spaces', 'secret')
  })
})

describe('getAnonKeyFromRequest', () => {
  it('returns null when no salt provided', async () => {
    const request = new Request('https://example.com', {
      headers: { 'cf-connecting-ip': '192.168.1.1' },
    })
    const result = await getAnonKeyFromRequest(request, undefined)
    expect(result).toBeNull()
  })

  it('returns hash when cf-connecting-ip header present', async () => {
    const request = new Request('https://example.com', {
      headers: { 'cf-connecting-ip': '192.168.1.1' },
    })
    const result = await getAnonKeyFromRequest(request, 'test-salt')
    expect(result).toBeDefined()
    expect(result).toHaveLength(64) // SHA-256 hex is 64 chars
  })

  it('returns hash when x-forwarded-for header present', async () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' },
    })
    const result = await getAnonKeyFromRequest(request, 'test-salt')
    expect(result).toBeDefined()
    expect(result).toHaveLength(64)
  })

  it('uses first IP from x-forwarded-for', async () => {
    const request1 = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' },
    })
    const request2 = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    })
    const result1 = await getAnonKeyFromRequest(request1, 'test-salt')
    const result2 = await getAnonKeyFromRequest(request2, 'test-salt')
    expect(result1).toBe(result2)
  })

  it('returns null when no IP headers present', async () => {
    const request = new Request('https://example.com', {
      headers: {},
    })
    const result = await getAnonKeyFromRequest(request, 'test-salt')
    expect(result).toBeNull()
  })

  it('prefers cf-connecting-ip over x-forwarded-for', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'cf-connecting-ip': '192.168.1.1',
        'x-forwarded-for': '10.0.0.1',
      },
    })
    const cfRequest = new Request('https://example.com', {
      headers: { 'cf-connecting-ip': '192.168.1.1' },
    })
    const result = await getAnonKeyFromRequest(request, 'test-salt')
    const cfResult = await getAnonKeyFromRequest(cfRequest, 'test-salt')
    expect(result).toBe(cfResult)
  })

  it('produces consistent hash for same IP and salt', async () => {
    const request1 = new Request('https://example.com', {
      headers: { 'cf-connecting-ip': '192.168.1.1' },
    })
    const request2 = new Request('https://example.com', {
      headers: { 'cf-connecting-ip': '192.168.1.1' },
    })
    const result1 = await getAnonKeyFromRequest(request1, 'test-salt')
    const result2 = await getAnonKeyFromRequest(request2, 'test-salt')
    expect(result1).toBe(result2)
  })

  it('produces different hash for different IPs', async () => {
    const request1 = new Request('https://example.com', {
      headers: { 'cf-connecting-ip': '192.168.1.1' },
    })
    const request2 = new Request('https://example.com', {
      headers: { 'cf-connecting-ip': '192.168.1.2' },
    })
    const result1 = await getAnonKeyFromRequest(request1, 'test-salt')
    const result2 = await getAnonKeyFromRequest(request2, 'test-salt')
    expect(result1).not.toBe(result2)
  })

  it('produces different hash for different salts', async () => {
    const request = new Request('https://example.com', {
      headers: { 'cf-connecting-ip': '192.168.1.1' },
    })
    const result1 = await getAnonKeyFromRequest(request, 'salt1')
    const result2 = await getAnonKeyFromRequest(request, 'salt2')
    expect(result1).not.toBe(result2)
  })
})

describe('isUserAdmin', () => {
  const createMockDb = (result: { is_admin: number } | null) => ({
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(result),
      }),
    }),
  })

  it('returns false for empty userId', async () => {
    const db = createMockDb({ is_admin: 1 })
    const result = await isUserAdmin(db as unknown as D1Database, '')
    expect(result).toBe(false)
  })

  it('returns false when user not found', async () => {
    const db = createMockDb(null)
    const result = await isUserAdmin(db as unknown as D1Database, 'user-123')
    expect(result).toBe(false)
  })

  it('returns false when user is_admin is 0', async () => {
    const db = createMockDb({ is_admin: 0 })
    const result = await isUserAdmin(db as unknown as D1Database, 'user-123')
    expect(result).toBe(false)
  })

  it('returns true when user is_admin is 1', async () => {
    const db = createMockDb({ is_admin: 1 })
    const result = await isUserAdmin(db as unknown as D1Database, 'user-123')
    expect(result).toBe(true)
  })

  it('queries database with correct userId', async () => {
    const db = createMockDb({ is_admin: 1 })
    await isUserAdmin(db as unknown as D1Database, 'user-123')
    expect(db.prepare).toHaveBeenCalledWith('SELECT is_admin FROM users WHERE id = ?')
    expect(db.prepare().bind).toHaveBeenCalledWith('user-123')
  })
})

describe('isUserTrusted', () => {
  const createMockDb = (result: { is_trusted: number } | null) => ({
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(result),
      }),
    }),
  })

  it('returns false for empty userId', async () => {
    const db = createMockDb({ is_trusted: 1 })
    const result = await isUserTrusted(db as unknown as D1Database, '')
    expect(result).toBe(false)
  })

  it('returns false when user not found', async () => {
    const db = createMockDb(null)
    const result = await isUserTrusted(db as unknown as D1Database, 'user-123')
    expect(result).toBe(false)
  })

  it('returns false when user is_trusted is 0', async () => {
    const db = createMockDb({ is_trusted: 0 })
    const result = await isUserTrusted(db as unknown as D1Database, 'user-123')
    expect(result).toBe(false)
  })

  it('returns true when user is_trusted is 1', async () => {
    const db = createMockDb({ is_trusted: 1 })
    const result = await isUserTrusted(db as unknown as D1Database, 'user-123')
    expect(result).toBe(true)
  })

  it('queries database with correct userId', async () => {
    const db = createMockDb({ is_trusted: 1 })
    await isUserTrusted(db as unknown as D1Database, 'user-123')
    expect(db.prepare).toHaveBeenCalledWith('SELECT is_trusted FROM users WHERE id = ?')
    expect(db.prepare().bind).toHaveBeenCalledWith('user-123')
  })
})
