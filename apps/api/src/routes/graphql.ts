import { Hono } from 'hono'
import { GraphQLError } from 'graphql'
import { createYoga, maskError } from 'graphql-yoga'
import { schema } from '../graphql/schema'
import {
  getAnonKeyFromRequest,
  getAuthFromRequest,
  verifyClerkToken,
  type AuthVerifier,
} from '../utils/auth'
import type { Bindings } from '../types'

const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
  maskedErrors: {
    maskError: (error, message, isDev) => {
      const hasExtensions =
        typeof error === 'object' && error !== null && 'extensions' in error
      if (error instanceof GraphQLError || hasExtensions) {
        return error as Error
      }
      return maskError(error, message, isDev)
    },
  },
})

export function createGraphQLRoutes(verifyAuth: AuthVerifier = verifyClerkToken) {
  const routes = new Hono<{ Bindings: Bindings }>()

  routes.on(['GET', 'POST'], '/api/graphql', async (c) => {
    const auth = await getAuthFromRequest(c.req.raw, c.env.CLERK_SECRET_KEY, verifyAuth)
    const anonKey = await getAnonKeyFromRequest(c.req.raw, c.env.ANON_RATE_LIMIT_SALT)
    const response = await yoga.handle(c.req.raw, { db: c.env.DB, auth, anonKey })
    return response
  })

  return routes
}
