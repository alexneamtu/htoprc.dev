import { describe, it, expect } from 'vitest'
import { buildAuthHeaders } from './graphql'

describe('buildAuthHeaders', () => {
  it('adds Authorization when token is present', () => {
    expect(buildAuthHeaders('token-123')).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token-123',
    })
  })

  it('omits Authorization when token is missing', () => {
    expect(buildAuthHeaders(null)).toEqual({
      'Content-Type': 'application/json',
    })
  })
})
