import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { GraphQLError } from 'graphql'
import { createYoga, maskError } from 'graphql-yoga'
import { schema } from './graphql/schema'
import { runScraper, runAllScrapers } from './services/scraper'
import type { Platform } from './services/scraper'
import {
  getAnonKeyFromRequest,
  getAuthFromRequest,
  verifyClerkToken,
  type AuthVerifier,
  isUserAdmin,
} from './utils/auth'

type Bindings = {
  DB: D1Database
  GITHUB_TOKEN?: string
  CLERK_SECRET_KEY?: string
  ANON_RATE_LIMIT_SALT?: string
}

type AppDependencies = {
  verifyAuth?: AuthVerifier
}

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

export function createApp({ verifyAuth = verifyClerkToken }: AppDependencies = {}) {
  const app = new Hono<{ Bindings: Bindings }>()

  // CORS configuration
  const allowedOrigins = [
    'https://htoprc.dev',
    'https://staging.htoprc.dev',
    'https://htoprc.dev.alexneamtu.top',
    'https://htoprc.staging.alexneamtu.top',
    'https://htoprc-production.pages.dev',
    'https://htoprc-staging.pages.dev',
  ]

  // Pattern for Cloudflare Pages preview URLs (e.g., https://abc123.htoprc-staging.pages.dev)
  const previewUrlPattern = /^https:\/\/[a-z0-9]+\.htoprc-(staging|production)\.pages\.dev$/

  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin) return allowedOrigins[0]
        // Allow any localhost port for development
        if (origin.match(/^http:\/\/localhost:\d+$/)) return origin
        // Allow Cloudflare Pages preview URLs
        if (previewUrlPattern.test(origin)) return origin
        return allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
      },
      credentials: true,
    })
  )

  // Security headers middleware
  app.use('*', async (c, next) => {
    await next()
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  })

  // Health check
  app.get('/api/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Sitemap.xml
  app.get('/sitemap.xml', async (c) => {
    const baseUrl = 'https://htoprc.dev'

    // Get all published configs
    const result = await c.env.DB.prepare(
      'SELECT slug, created_at FROM configs WHERE status = ? ORDER BY created_at DESC LIMIT 1000'
    )
      .bind('published')
      .all<{ slug: string; created_at: string }>()

    const configs = result.results ?? []

    const urls: Array<{ loc: string; lastmod?: string; priority: string; changefreq: string }> = [
      { loc: baseUrl, priority: '1.0', changefreq: 'daily' },
      { loc: `${baseUrl}/editor`, priority: '0.8', changefreq: 'monthly' },
      ...configs.map((config) => ({
        loc: `${baseUrl}/config/${config.slug}`,
        lastmod: config.created_at.split('T')[0],
        priority: '0.6',
        changefreq: 'monthly',
      })),
    ]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
      },
    })
  })

  // GraphQL endpoint
  app.on(['GET', 'POST'], '/api/graphql', async (c) => {
    const auth = await getAuthFromRequest(c.req.raw, c.env.CLERK_SECRET_KEY, verifyAuth)
    const anonKey = await getAnonKeyFromRequest(
      c.req.raw,
      c.env.ANON_RATE_LIMIT_SALT ?? c.env.CLERK_SECRET_KEY
    )
    const response = await yoga.handle(c.req.raw, { db: c.env.DB, auth, anonKey })
    return response
  })

  // Admin endpoint to trigger scraper manually
  app.post('/api/admin/scrape', async (c) => {
    const auth = await getAuthFromRequest(c.req.raw, c.env.CLERK_SECRET_KEY, verifyAuth)
    if (!auth) {
      return c.json({ error: 'Unauthorized: Auth token required' }, 401)
    }

    const admin = await isUserAdmin(c.env.DB, auth.userId)
    if (!admin) {
      return c.json({ error: 'Forbidden: Admin access required' }, 403)
    }

    const body = await c.req.json<{ platform?: Platform }>().catch(() => ({ platform: undefined }))
    const platform = body.platform || 'github'

    const ctx = {
      db: c.env.DB,
      githubToken: c.env.GITHUB_TOKEN,
    }

    const result = await runScraper(platform as Platform, ctx)

    return c.json(result)
  })

  // Get scraper run history
  app.get('/api/admin/scraper-logs', async (c) => {
    const auth = await getAuthFromRequest(c.req.raw, c.env.CLERK_SECRET_KEY, verifyAuth)
    if (!auth) {
      return c.json({ error: 'Unauthorized: Auth token required' }, 401)
    }

    const admin = await isUserAdmin(c.env.DB, auth.userId)
    if (!admin) {
      return c.json({ error: 'Forbidden: Admin access required' }, 403)
    }

    const limit = parseInt(c.req.query('limit') || '10', 10)

    const result = await c.env.DB.prepare(
      'SELECT * FROM scraper_runs ORDER BY started_at DESC LIMIT ?'
    )
      .bind(limit)
      .all<{
        id: string
        platform: string
        status: string
        started_at: string
        completed_at: string | null
        configs_found: number
        configs_added: number
        error_message: string | null
      }>()

    return c.json({
      runs: result.results ?? [],
    })
  })

  // Fallback
  app.notFound((c) => {
    return c.json({ error: 'Not found' }, 404)
  })

  return app
}

const app = createApp()

// Cron handler for scheduled scraping
const scheduled: ExportedHandler<Bindings>['scheduled'] = async (event, env) => {
  const ctx = {
    db: env.DB,
    githubToken: env.GITHUB_TOKEN,
  }

  const results = await runAllScrapers(ctx)

  console.log('Scraper run completed:', Object.fromEntries(results))
}

// Export app for testing
export { app }

export default {
  fetch: app.fetch,
  scheduled,
}
