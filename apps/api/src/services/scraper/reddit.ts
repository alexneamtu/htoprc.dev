import type { ScrapedConfig, ScraperResult, ScraperContext } from './types'
import { processScrapedConfig, generateSlug } from './common'

const REDDIT_API_BASE = 'https://www.reddit.com'
const SUBREDDITS = ['unixporn', 'linux']

interface RedditPost {
  data: {
    id: string
    title: string
    selftext: string
    author: string
    permalink: string
    url: string
    created_utc: number
  }
}

interface RedditListing {
  kind: string
  data: {
    children: RedditPost[]
    after: string | null
  }
}

export async function searchRedditSubreddit(
  subreddit: string,
  query: string,
  after?: string
): Promise<RedditListing | null> {
  const url = new URL(`${REDDIT_API_BASE}/r/${subreddit}/search.json`)
  url.searchParams.set('q', query)
  url.searchParams.set('restrict_sr', 'on')
  url.searchParams.set('sort', 'new')
  url.searchParams.set('limit', '100')
  if (after) {
    url.searchParams.set('after', after)
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'htoprc-scraper/1.0',
      },
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as RedditListing
  } catch {
    return null
  }
}

function extractHtoprcFromText(text: string): string | null {
  // Look for htoprc content in code blocks
  const codeBlockRegex = /```(?:htoprc|conf|ini|bash|sh)?\s*([\s\S]*?)```/g
  const matches = [...text.matchAll(codeBlockRegex)]

  for (const match of matches) {
    const content = match[1]?.trim()
    // Check if it looks like htoprc content
    if (content && looksLikeHtoprc(content)) {
      return content
    }
  }

  // Also check for indented code blocks (4 spaces)
  const indentedRegex = /^(?: {4}|\t)(.+)$/gm
  const indentedLines: string[] = []
  let lineMatch

  while ((lineMatch = indentedRegex.exec(text)) !== null) {
    if (lineMatch[1]) {
      indentedLines.push(lineMatch[1])
    }
  }

  if (indentedLines.length > 5) {
    const indentedContent = indentedLines.join('\n')
    if (looksLikeHtoprc(indentedContent)) {
      return indentedContent
    }
  }

  return null
}

function looksLikeHtoprc(content: string): boolean {
  // Check for common htoprc options
  const htoprcPatterns = [
    /fields=/i,
    /sort_key=/i,
    /color_scheme=/i,
    /header_layout=/i,
    /column_meters/i,
    /tree_view=/i,
    /show_program_path=/i,
    /highlight_base_name=/i,
    /hide_kernel_threads=/i,
    /htop_version=/i,
  ]

  let matchCount = 0
  for (const pattern of htoprcPatterns) {
    if (pattern.test(content)) {
      matchCount++
    }
  }

  // At least 3 htoprc-specific options suggests it's an htoprc file
  return matchCount >= 3
}

export async function scrapeReddit(ctx: ScraperContext): Promise<ScraperResult> {
  let configsFound = 0
  let configsAdded = 0

  try {
    for (const subreddit of SUBREDDITS) {
      // Search for posts mentioning htoprc
      const searchQueries = ['htoprc', 'htop config', '.htoprc']

      for (const query of searchQueries) {
        const listing = await searchRedditSubreddit(subreddit, query)
        if (!listing) {
          continue
        }

        for (const post of listing.data.children) {
          const postData = post.data
          const htoprcContent = extractHtoprcFromText(postData.selftext)

          if (!htoprcContent) {
            continue
          }

          configsFound++

          const sourceUrl = `https://reddit.com${postData.permalink}`

          const scrapedConfig: ScrapedConfig = {
            content: htoprcContent,
            sourceUrl,
            sourcePlatform: 'reddit',
            author: postData.author,
            title: postData.title.slice(0, 100),
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

          const slug = generateSlug(`reddit-${subreddit}`, postData.id)

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
              'reddit',
              processed.status,
              processed.parseResult.score
            )
            .run()

          configsAdded++
        }

        // Small delay between searches to be respectful
        await new Promise((resolve) => setTimeout(resolve, 1000))
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
