import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createYoga } from 'graphql-yoga'
import { schema } from './graphql/schema'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS configuration
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:5173',
      'https://htoprc.dev',
      'https://htoprc.dev.alexneamtu.top',
      'https://htoprc.staging.alexneamtu.top',
    ],
    credentials: true,
  })
)

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

  const urls = [
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
const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
})

app.on(['GET', 'POST'], '/api/graphql', async (c) => {
  const response = await yoga.handle(c.req.raw, { db: c.env.DB })
  return response
})

// Fallback
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

export default app
