import type { Hono } from 'hono'
import type { AuthVerifier } from './utils/auth'

export type Bindings = {
  DB: D1Database
  GITHUB_TOKEN?: string
  GITLAB_TOKEN?: string
  CLERK_SECRET_KEY?: string
  ANON_RATE_LIMIT_SALT?: string
  BASE_URL?: string
}

export type AppDependencies = {
  verifyAuth?: AuthVerifier
}

export type App = Hono<{ Bindings: Bindings }>
