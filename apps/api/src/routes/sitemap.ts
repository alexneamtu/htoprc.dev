import { Hono } from 'hono'
import type { Bindings } from '../types'

export const sitemapRoutes = new Hono<{ Bindings: Bindings }>()

sitemapRoutes.get('/sitemap.xml', async (c) => {
  const baseUrl = c.env.BASE_URL || 'https://htoprc.dev'

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
