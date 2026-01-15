import { createClient, cacheExchange, fetchExchange, type Client } from 'urql'
import { authExchange } from '@urql/exchange-auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export function buildAuthHeaders(token: string | null | undefined) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export type GetToken = () => Promise<string | null>

export function createGraphqlClient(getToken?: GetToken): Client {
  return createClient({
    url: `${API_URL}/api/graphql`,
    exchanges: [
      cacheExchange,
      authExchange(async (utils) => {
        // Get initial token
        let token = getToken ? await getToken() : null

        return {
          addAuthToOperation: (operation) => {
            if (!token) return operation
            return utils.appendHeaders(operation, {
              Authorization: `Bearer ${token}`,
            })
          },
          didAuthError: (error) => {
            return error.graphQLErrors.some(
              (e) => e.extensions?.code === 'UNAUTHENTICATED'
            )
          },
          refreshAuth: async () => {
            token = getToken ? await getToken() : null
          },
        }
      }),
      fetchExchange,
    ],
    preferGetMethod: false,
    fetchOptions: {
      headers: { 'Content-Type': 'application/json' },
    },
  })
}

export const client = createGraphqlClient()
