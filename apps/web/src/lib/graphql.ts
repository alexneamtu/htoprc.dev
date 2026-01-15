import { createClient, cacheExchange, fetchExchange } from 'urql'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export function buildAuthHeaders(token: string | null | undefined) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export type GetToken = () => Promise<string | null>

export function createGraphqlClient(getToken?: GetToken) {
  return createClient({
    url: `${API_URL}/api/graphql`,
    exchanges: [cacheExchange, fetchExchange],
    preferGetMethod: false,
    fetchOptions: async () => {
      const token = getToken ? await getToken() : null
      return { headers: buildAuthHeaders(token) }
    },
  })
}

export const client = createGraphqlClient()
