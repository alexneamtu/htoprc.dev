import type { ScrapedConfig, ScraperResult, ScraperContext } from './types'
import { processScrapedConfig, generateSlug } from './common'

const GITHUB_API_BASE = 'https://api.github.com'

interface GistFile {
  filename: string
  type: string
  language: string | null
  raw_url: string
  size: number
}

interface GistListItem {
  id: string
  html_url: string
  files: Record<string, GistFile>
  owner: {
    login: string
  } | null
  description: string | null
  public: boolean
  created_at: string
}

export async function fetchPublicGists(
  token: string,
  page: number = 1
): Promise<GistListItem[] | null> {
  const url = `${GITHUB_API_BASE}/gists/public?per_page=100&page=${page}`

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

    return (await response.json()) as GistListItem[]
  } catch {
    return null
  }
}

export async function fetchGistFileContent(
  rawUrl: string,
  token: string
): Promise<string | null> {
  try {
    const response = await fetch(rawUrl, {
      headers: {
        Authorization: `token ${token}`,
        'User-Agent': 'htoprc-scraper',
      },
    })

    if (!response.ok) {
      return null
    }

    return await response.text()
  } catch {
    return null
  }
}

function isHtoprcFile(filename: string): boolean {
  const lowerName = filename.toLowerCase()
  return (
    lowerName === 'htoprc' ||
    lowerName === '.htoprc' ||
    lowerName.endsWith('/htoprc') ||
    lowerName.endsWith('/.htoprc')
  )
}

export async function scrapeGists(ctx: ScraperContext): Promise<ScraperResult> {
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
    // Fetch multiple pages of public gists
    const maxPages = 5
    const allGists: GistListItem[] = []

    for (let page = 1; page <= maxPages; page++) {
      const gists = await fetchPublicGists(ctx.githubToken, page)
      if (!gists || gists.length === 0) {
        break
      }
      allGists.push(...gists)
    }

    // Filter gists that contain htoprc files
    for (const gist of allGists) {
      const htoprcFiles = Object.entries(gist.files).filter(([filename]) =>
        isHtoprcFile(filename)
      )

      for (const [filename, file] of htoprcFiles) {
        configsFound++

        const content = await fetchGistFileContent(file.raw_url, ctx.githubToken)
        if (!content) {
          continue
        }

        const sourceUrl = `${gist.html_url}#file-${filename.replace(/\./g, '-')}`

        const scrapedConfig: ScrapedConfig = {
          content,
          sourceUrl,
          sourcePlatform: 'gist',
          author: gist.owner?.login || 'anonymous',
          title: gist.description || `Gist: ${filename}`,
        }

        const processed = await processScrapedConfig(scrapedConfig)

        // Check for existing URL
        const existingUrl = await ctx.db
          .prepare('SELECT id FROM configs WHERE source_url = ?')
          .bind(sourceUrl)
          .first()

        if (existingUrl) {
          continue
        }

        // Check for existing content hash
        const existingHash = await ctx.db
          .prepare('SELECT id FROM configs WHERE content_hash = ?')
          .bind(processed.contentHash)
          .first()

        if (existingHash) {
          continue
        }

        const slug = generateSlug(
          gist.owner?.login || 'gist',
          filename
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
            sourceUrl,
            'gist',
            processed.status,
            processed.parseResult.score
          )
          .run()

        configsAdded++
      }
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
