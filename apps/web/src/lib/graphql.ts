import { createClient, cacheExchange, fetchExchange } from 'urql'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export const client = createClient({
  url: `${API_URL}/api/graphql`,
  exchanges: [cacheExchange, fetchExchange],
  preferGetMethod: false,
  fetchOptions: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
})
