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

  const staticUrls: Array<{ loc: string; priority: string; changefreq: string }> = [
    { loc: baseUrl, priority: '1.0', changefreq: 'daily' },
    { loc: `${baseUrl}/gallery`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/editor`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${baseUrl}/what-is-htoprc`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${baseUrl}/customize-htop`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${baseUrl}/htop-config-quick-guide`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${baseUrl}/about`, priority: '0.4', changefreq: 'yearly' },
    { loc: `${baseUrl}/privacy`, priority: '0.3', changefreq: 'yearly' },
  ]

  const urls: Array<{ loc: string; lastmod?: string; priority: string; changefreq: string }> = [
    ...staticUrls,
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
