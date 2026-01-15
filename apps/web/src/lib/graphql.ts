import { createClient, cacheExchange, fetchExchange } from 'urql'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export function buildAuthHeaders(token: string | null | undefined) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const client = createClient({
  url: `${API_URL}/api/graphql`,
  exchanges: [cacheExchange, fetchExchange],
  preferGetMethod: false,
  fetchOptions: {
    headers: buildAuthHeaders(null),
  },
})
