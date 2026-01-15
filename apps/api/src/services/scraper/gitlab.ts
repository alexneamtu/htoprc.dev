import type {
  ScrapedConfig,
  ScraperResult,
  ScraperContext,
  GitLabSearchResult,
  GitLabProject,
} from './types'
import {
  createContentHash,
  processScrapedConfig,
  shouldFlagConfig,
  generateSlug,
} from './github'

const GITLAB_API_BASE = 'https://gitlab.com/api/v4'

export async function searchGitLab(
  query: string,
  token?: string,
  page: number = 1
): Promise<GitLabSearchResult[] | null> {
  const url = `${GITLAB_API_BASE}/search?scope=blobs&search=${encodeURIComponent(query)}&per_page=20&page=${page}`

  const headers: HeadersInit = {
    'User-Agent': 'htoprc-scraper',
  }

  if (token) {
    headers['PRIVATE-TOKEN'] = token
  }

  try {
    const response = await fetch(url, { headers })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as GitLabSearchResult[]
  } catch {
    return null
  }
}

export async function fetchGitLabProject(
  projectId: number,
  token?: string
): Promise<GitLabProject | null> {
  const url = `${GITLAB_API_BASE}/projects/${projectId}`

  const headers: HeadersInit = {
    'User-Agent': 'htoprc-scraper',
  }

  if (token) {
    headers['PRIVATE-TOKEN'] = token
  }

  try {
    const response = await fetch(url, { headers })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as GitLabProject
  } catch {
    return null
  }
}

export async function fetchGitLabFileContent(
  projectId: number,
  filePath: string,
  ref: string,
  token?: string
): Promise<string | null> {
  const encodedPath = encodeURIComponent(filePath)
  const url = `${GITLAB_API_BASE}/projects/${projectId}/repository/files/${encodedPath}/raw?ref=${ref}`

  const headers: HeadersInit = {
    'User-Agent': 'htoprc-scraper',
  }

  if (token) {
    headers['PRIVATE-TOKEN'] = token
  }

  try {
    const response = await fetch(url, { headers })

    if (!response.ok) {
      return null
    }

    return await response.text()
  } catch {
    return null
  }
}

export async function scrapeGitLab(ctx: ScraperContext): Promise<ScraperResult> {
  let configsFound = 0
  let configsAdded = 0

  try {
    // Search for htoprc files
    const searchResults = await searchGitLab('filename:htoprc', ctx.gitlabToken)

    if (!searchResults) {
      return {
        success: false,
        configsFound: 0,
        configsAdded: 0,
        error: 'Failed to search GitLab',
      }
    }

    configsFound = searchResults.length

    for (const item of searchResults) {
      // Fetch project details for the URL
      const project = await fetchGitLabProject(item.project_id, ctx.gitlabToken)
      if (!project) {
        continue
      }

      // Fetch full file content
      const content = await fetchGitLabFileContent(
        item.project_id,
        item.path,
        item.ref,
        ctx.gitlabToken
      )

      if (!content) {
        continue
      }

      const sourceUrl = `${project.web_url}/-/blob/${item.ref}/${item.path}`

      const scrapedConfig: ScrapedConfig = {
        content,
        sourceUrl,
        sourcePlatform: 'gitlab',
        author: project.namespace.path,
        title: `${project.path_with_namespace}/${item.path}`,
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

      const slug = generateSlug(project.path_with_namespace, item.filename)

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
          'gitlab',
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
