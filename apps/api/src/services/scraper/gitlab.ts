import type {
  ScrapedConfig,
  ScraperResult,
  ScraperContext,
  GitLabProject,
} from './types'
import { processScrapedConfig, generateSlug } from './common'

const GITLAB_API_BASE = 'https://gitlab.com/api/v4'

interface GitLabTreeItem {
  id: string
  name: string
  type: 'blob' | 'tree'
  path: string
  mode: string
}

/**
 * Search for public projects on GitLab
 */
export async function searchGitLabProjects(
  query: string,
  token?: string,
  page: number = 1,
  perPage: number = 20
): Promise<GitLabProject[] | null> {
  const url = `${GITLAB_API_BASE}/projects?search=${encodeURIComponent(query)}&visibility=public&per_page=${perPage}&page=${page}&order_by=last_activity_at`

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

    return (await response.json()) as GitLabProject[]
  } catch {
    return null
  }
}

/**
 * List files in a GitLab project repository
 */
export async function listGitLabProjectFiles(
  projectId: number,
  token?: string,
  ref?: string
): Promise<GitLabTreeItem[] | null> {
  let url = `${GITLAB_API_BASE}/projects/${projectId}/repository/tree?recursive=true&per_page=100`
  if (ref) {
    url += `&ref=${encodeURIComponent(ref)}`
  }

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

    return (await response.json()) as GitLabTreeItem[]
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

/**
 * Scrape GitLab for htoprc files by searching dotfiles projects
 * and scanning their repository trees.
 *
 * This approach works with free GitLab accounts (global blob search requires Premium).
 */
export async function scrapeGitLab(ctx: ScraperContext): Promise<ScraperResult> {
  let configsFound = 0
  let configsAdded = 0

  try {
    // Search for dotfiles projects
    const projects = await searchGitLabProjects('dotfiles', ctx.gitlabToken)

    if (!projects) {
      return {
        success: false,
        configsFound: 0,
        configsAdded: 0,
        error: 'Failed to search GitLab projects',
      }
    }

    for (const project of projects) {
      // List files in the project
      const files = await listGitLabProjectFiles(
        project.id,
        ctx.gitlabToken,
        project.default_branch
      )

      if (!files) {
        continue
      }

      // Filter for htoprc files
      const htoprcFiles = files.filter(
        (f) => f.type === 'blob' && f.name.toLowerCase().includes('htoprc')
      )

      for (const file of htoprcFiles) {
        configsFound++

        // Fetch file content
        const content = await fetchGitLabFileContent(
          project.id,
          file.path,
          project.default_branch || 'main',
          ctx.gitlabToken
        )

        if (!content) {
          continue
        }

        const sourceUrl = `${project.web_url}/-/blob/${project.default_branch || 'main'}/${file.path}`

        const scrapedConfig: ScrapedConfig = {
          content,
          sourceUrl,
          sourcePlatform: 'gitlab',
          author: project.namespace.path,
          title: `${project.path_with_namespace}/${file.path}`,
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

        const slug = generateSlug(project.path_with_namespace, file.name)

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
