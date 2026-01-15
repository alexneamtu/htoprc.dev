import { scrapeGitHub } from './github'
import { scrapeGitLab } from './gitlab'
import { scrapeGists } from './gist'
import { scrapeReddit } from './reddit'
import type { Platform, ScraperResult, ScraperContext } from './types'

export { scrapeGitHub } from './github'
export { scrapeGitLab } from './gitlab'
export { scrapeGists } from './gist'
export { scrapeReddit } from './reddit'
export type { Platform, ScraperResult, ScraperContext, ScrapedConfig, ProcessedConfig } from './types'

export async function runScraper(
  platform: Platform,
  ctx: ScraperContext
): Promise<ScraperResult> {
  const runId = crypto.randomUUID()
  const startedAt = new Date().toISOString()

  await ctx.db
    .prepare(
      `INSERT INTO scraper_runs (id, platform, status, started_at, configs_found, configs_added)
       VALUES (?, ?, 'running', ?, 0, 0)`
    )
    .bind(runId, platform, startedAt)
    .run()

  let result: ScraperResult

  try {
    switch (platform) {
      case 'github':
        result = await scrapeGitHub(ctx)
        break
      case 'gist':
        result = await scrapeGists(ctx)
        break
      case 'gitlab':
        result = await scrapeGitLab(ctx)
        break
      case 'reddit':
        result = await scrapeReddit(ctx)
        break
      default:
        result = {
          success: false,
          configsFound: 0,
          configsAdded: 0,
          error: `Unknown platform: ${platform}`,
        }
    }

    await ctx.db
      .prepare(
        `UPDATE scraper_runs
         SET status = ?, completed_at = ?, configs_found = ?, configs_added = ?, error_message = ?
         WHERE id = ?`
      )
      .bind(
        result.success ? 'completed' : 'failed',
        new Date().toISOString(),
        result.configsFound,
        result.configsAdded,
        result.error || null,
        runId
      )
      .run()

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await ctx.db
      .prepare(
        `UPDATE scraper_runs
         SET status = 'failed', completed_at = ?, error_message = ?
         WHERE id = ?`
      )
      .bind(new Date().toISOString(), errorMessage, runId)
      .run()

    return {
      success: false,
      configsFound: 0,
      configsAdded: 0,
      error: errorMessage,
    }
  }
}

export async function runAllScrapers(ctx: ScraperContext): Promise<Map<Platform, ScraperResult>> {
  const results = new Map<Platform, ScraperResult>()

  const platforms: Platform[] = ['github', 'gitlab', 'gist', 'reddit']

  for (const platform of platforms) {
    const result = await runScraper(platform, ctx)
    results.set(platform, result)
  }

  return results
}
