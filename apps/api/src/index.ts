import { Hono } from 'hono'
import { verifyClerkToken } from './utils/auth'
import { runAllScrapers } from './services/scraper'
import { cleanupOldRateLimits } from './services/rateLimit.service'
import { corsMiddleware, securityHeaders } from './middleware'
import { healthRoutes, sitemapRoutes, createGraphQLRoutes, createAdminRoutes } from './routes'
import type { Bindings, AppDependencies } from './types'

export function createApp({ verifyAuth = verifyClerkToken }: AppDependencies = {}) {
  const app = new Hono<{ Bindings: Bindings }>()

  // Middleware
  app.use('*', corsMiddleware)
  app.use('*', securityHeaders)

  // Routes
  app.route('/', healthRoutes)
  app.route('/', sitemapRoutes)
  app.route('/', createGraphQLRoutes(verifyAuth))
  app.route('/', createAdminRoutes(verifyAuth))

  // Fallback
  app.notFound((c) => {
    return c.json({ error: 'Not found' }, 404)
  })

  return app
}

const app = createApp()

// Cron handler for scheduled scraping and maintenance
const scheduled: ExportedHandler<Bindings>['scheduled'] = async (event, env) => {
  const ctx = {
    db: env.DB,
    githubToken: env.GITHUB_TOKEN,
    gitlabToken: env.GITLAB_TOKEN,
  }

  // Run scrapers
  const results = await runAllScrapers(ctx)
  console.log('Scraper run completed:', Object.fromEntries(results))

  // Clean up old rate limit records
  const cleanup = await cleanupOldRateLimits(env.DB)
  console.log('Rate limit cleanup completed:', cleanup)
}

// Export app for testing
export { app }

export default {
  fetch: app.fetch,
  scheduled,
}
