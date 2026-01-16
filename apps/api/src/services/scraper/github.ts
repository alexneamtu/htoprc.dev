import {
  processScrapedConfig,
  generateSlug,
  createContentHash,
  shouldFlagConfig,
} from './common'
import type {
  ScrapedConfig,
  GitHubSearchResult,
  GitHubSearchItem,
  ScraperResult,
  ScraperContext,
} from './types'

// Re-export for backwards compatibility
export { processScrapedConfig, generateSlug, createContentHash, shouldFlagConfig }

const GITHUB_API_BASE = 'https://api.github.com'


export async function fetchGitHubContent(
  url: string,
  token?: string
): Promise<string | null> {
  const rawUrl = url
    .replace('github.com', 'raw.githubusercontent.com')
    .replace('/blob/', '/')

  const headers: HeadersInit = {
    'User-Agent': 'htoprc-scraper',
  }

  if (token) {
    headers['Authorization'] = `token ${token}`
  }

  try {
    const response = await fetch(rawUrl, { headers })
    if (!response.ok) {
      return null
    }
    return await response.text()
  } catch {
    return null
  }
}

export async function searchGitHub(
  query: string,
  token: string,
  page: number = 1
): Promise<GitHubSearchResult | null> {
  const url = `${GITHUB_API_BASE}/search/code?q=${encodeURIComponent(query)}&per_page=30&page=${page}`

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        'User-Agent': 'htoprc-scraper',
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as GitHubSearchResult
  } catch {
    return null
  }
}

export function extractConfigFromSearchItem(item: GitHubSearchItem): ScrapedConfig {
  return {
    content: '',
    sourceUrl: item.html_url,
    sourcePlatform: 'github',
    author: item.repository.owner.login,
    title: `${item.repository.full_name}/${item.path}`,
  }
}

export async function scrapeGitHub(ctx: ScraperContext): Promise<ScraperResult> {
  if (!ctx.githubToken) {
    return {
      success: false,
      configsFound: 0,
      configsAdded: 0,
      error: 'GitHub token not configured',
    }
  }

  let configsFound = 0
  let configsAdded = 0

  try {
    const searchResult = await searchGitHub('filename:htoprc', ctx.githubToken)
    if (!searchResult) {
      return {
        success: false,
        configsFound: 0,
        configsAdded: 0,
        error: 'Failed to search GitHub',
      }
    }

    configsFound = searchResult.items.length

    for (const item of searchResult.items) {
      const content = await fetchGitHubContent(item.html_url, ctx.githubToken)
      if (!content) {
        continue
      }

      const scrapedConfig = {
        ...extractConfigFromSearchItem(item),
        content,
      }

      const processed = await processScrapedConfig(scrapedConfig)

      const existingUrl = await ctx.db
        .prepare('SELECT id FROM configs WHERE source_url = ?')
        .bind(scrapedConfig.sourceUrl)
        .first()

      if (existingUrl) {
        continue
      }

      const existingHash = await ctx.db
        .prepare('SELECT id FROM configs WHERE content_hash = ?')
        .bind(processed.contentHash)
        .first()

      if (existingHash) {
        continue
      }

      const slug = generateSlug(
        item.repository.full_name,
        item.name
      )

      const id = crypto.randomUUID()
      await ctx.db
        .prepare(
          `INSERT INTO configs (
            id, slug, title, content, content_hash, source_type, source_url,
            source_platform, status, score
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          slug,
          scrapedConfig.title || slug,
          scrapedConfig.content,
          processed.contentHash,
          'scraped',
          scrapedConfig.sourceUrl,
          'github',
          processed.status,
          processed.parseResult.score
        )
        .run()

      configsAdded++
    }

    return {
      success: true,
      configsFound,
      configsAdded,
    }
  } catch (error) {
    return {
      success: false,
      configsFound,
      configsAdded,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
