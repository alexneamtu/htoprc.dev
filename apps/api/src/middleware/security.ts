import type { MiddlewareHandler } from 'hono'
import type { Bindings } from '../types'

export const securityHeaders: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self' data:; connect-src 'self' https://api.htoprc.dev https://api-staging.htoprc.dev https://*.clerk.accounts.dev; frame-ancestors 'none'"
  )
}
