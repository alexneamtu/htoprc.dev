import { cors } from 'hono/cors'

const allowedOrigins = [
  'https://htoprc.dev',
  'https://staging.htoprc.dev',
  'https://htoprc-production.pages.dev',
  'https://htoprc-staging.pages.dev',
]

const previewUrlPattern = /^https:\/\/[a-z0-9-]+\.htoprc-(staging|production)\.pages\.dev$/

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return allowedOrigins[0]
    if (origin.match(/^http:\/\/localhost:\d+$/)) return origin
    if (previewUrlPattern.test(origin)) return origin
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  },
  credentials: true,
})
