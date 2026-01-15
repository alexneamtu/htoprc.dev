import { parseHtoprc } from '@htoprc/parser'
import type { ParseResult } from '@htoprc/parser'
import type {
  ScrapedConfig,
  ProcessedConfig,
  GitHubSearchResult,
  GitHubSearchItem,
  ScraperResult,
  ScraperContext,
} from './types'

const GITHUB_API_BASE = 'https://api.github.com'
const MIN_SCORE_THRESHOLD = 5
const MIN_LINES_THRESHOLD = 5

export async function createContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function shouldFlagConfig(
  parseResult: ParseResult,
  lineCount: number
): { shouldFlag: boolean; reason?: string } {
  if (parseResult.errors.length > 0) {
    return {
      shouldFlag: true,
      reason: `Parse error: ${parseResult.errors[0].message}`,
    }
  }

  if (lineCount < MIN_LINES_THRESHOLD) {
    return {
      shouldFlag: true,
      reason: `Config too short (${lineCount} lines, minimum ${MIN_LINES_THRESHOLD})`,
    }
  }

  if (parseResult.score < MIN_SCORE_THRESHOLD) {
    return {
      shouldFlag: true,
      reason: `Low score (${parseResult.score}, minimum ${MIN_SCORE_THRESHOLD})`,
    }
  }

  return { shouldFlag: false }
}

export function generateSlug(repoFullName: string, fileName: string): string {
  const sanitized = repoFullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)

  const randomSuffix = Math.random().toString(36).substring(2, 10)
  return `${sanitized}-${randomSuffix}`
}

export async function processScrapedConfig(
  scrapedConfig: ScrapedConfig
): Promise<ProcessedConfig> {
  const contentHash = await createContentHash(scrapedConfig.content)
  const parseResult = parseHtoprc(scrapedConfig.content)
  const lineCount = scrapedConfig.content.split('\n').filter((l) => l.trim()).length

  const { shouldFlag, reason } = shouldFlagConfig(parseResult, lineCount)

  return {
    config: scrapedConfig,
    parseResult,
    contentHash,
    status: shouldFlag ? 'flagged' : 'published',
    flagReason: reason,
  }
}

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

      await ctx.db
        .prepare(
          `INSERT INTO configs (
            slug, title, content, content_hash, source_type, source_url,
            source_platform, status, score
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
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
