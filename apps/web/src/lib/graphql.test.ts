import { describe, it, expect } from 'vitest'
import { createRequest, gql } from 'urql'
import { buildAuthHeaders, createGraphqlClient } from './graphql'

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

  it('createGraphqlClient sets up client with correct base fetchOptions', () => {
    const client = createGraphqlClient(async () => 'token-abc')
    const request = createRequest(gql`query { __typename }`, {})
    const operation = client.createRequestOperation('query', request, {})
    const fetchOptions = operation.context.fetchOptions
    const options = typeof fetchOptions === 'function' ? fetchOptions() : fetchOptions
    // Auth is handled by authExchange, fetchOptions only has Content-Type
    expect(options).toEqual({
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })
})
