import { Hono } from 'hono'
import { runScraper } from '../services/scraper'
import type { Platform } from '../services/scraper'
import {
  getAuthFromRequest,
  verifyClerkToken,
  type AuthVerifier,
  isUserAdmin,
} from '../utils/auth'
import type { Bindings } from '../types'

export function createAdminRoutes(verifyAuth: AuthVerifier = verifyClerkToken) {
  const routes = new Hono<{ Bindings: Bindings }>()

  routes.post('/api/admin/scrape', async (c) => {
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
      gitlabToken: c.env.GITLAB_TOKEN,
    }

    const result = await runScraper(platform as Platform, ctx)

    return c.json(result)
  })

  routes.get('/api/admin/scraper-logs', async (c) => {
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

  return routes
}
