import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runScraper, runAllScrapers } from './index'
import type { ScraperContext, ScraperResult } from './types'

// Mock the individual scrapers
vi.mock('./github', () => ({
  scrapeGitHub: vi.fn(),
}))
vi.mock('./gitlab', () => ({
  scrapeGitLab: vi.fn(),
}))
vi.mock('./gist', () => ({
  scrapeGists: vi.fn(),
}))
vi.mock('./reddit', () => ({
  scrapeReddit: vi.fn(),
}))

import { scrapeGitHub } from './github'
import { scrapeGitLab } from './gitlab'
import { scrapeGists } from './gist'
import { scrapeReddit } from './reddit'

function createMockDb() {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    }),
  }
}

function createMockContext(overrides: Partial<ScraperContext> = {}): ScraperContext {
  return {
    db: createMockDb() as unknown as D1Database,
    ...overrides,
  }
}

describe('runScraper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs github scraper and records success', async () => {
    const mockResult: ScraperResult = {
      success: true,
      configsFound: 5,
      configsAdded: 3,
    }
    vi.mocked(scrapeGitHub).mockResolvedValue(mockResult)

    const ctx = createMockContext()
    const result = await runScraper('github', ctx)

    expect(scrapeGitHub).toHaveBeenCalledWith(ctx)
    expect(result).toEqual(mockResult)
    expect(ctx.db.prepare).toHaveBeenCalledTimes(2) // INSERT and UPDATE
  })

  it('runs gitlab scraper', async () => {
    const mockResult: ScraperResult = {
      success: true,
      configsFound: 10,
      configsAdded: 7,
    }
    vi.mocked(scrapeGitLab).mockResolvedValue(mockResult)

    const ctx = createMockContext()
    const result = await runScraper('gitlab', ctx)

    expect(scrapeGitLab).toHaveBeenCalledWith(ctx)
    expect(result).toEqual(mockResult)
  })

  it('runs gist scraper', async () => {
    const mockResult: ScraperResult = {
      success: true,
      configsFound: 3,
      configsAdded: 2,
    }
    vi.mocked(scrapeGists).mockResolvedValue(mockResult)

    const ctx = createMockContext()
    const result = await runScraper('gist', ctx)

    expect(scrapeGists).toHaveBeenCalledWith(ctx)
    expect(result).toEqual(mockResult)
  })

  it('runs reddit scraper', async () => {
    const mockResult: ScraperResult = {
      success: true,
      configsFound: 8,
      configsAdded: 4,
    }
    vi.mocked(scrapeReddit).mockResolvedValue(mockResult)

    const ctx = createMockContext()
    const result = await runScraper('reddit', ctx)

    expect(scrapeReddit).toHaveBeenCalledWith(ctx)
    expect(result).toEqual(mockResult)
  })

  it('handles unknown platform', async () => {
    const ctx = createMockContext()
    const result = await runScraper('unknown' as never, ctx)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Unknown platform')
  })

  it('records failure when scraper fails', async () => {
    const mockResult: ScraperResult = {
      success: false,
      configsFound: 0,
      configsAdded: 0,
      error: 'API rate limited',
    }
    vi.mocked(scrapeGitHub).mockResolvedValue(mockResult)

    const ctx = createMockContext()
    const result = await runScraper('github', ctx)

    expect(result.success).toBe(false)
    expect(result.error).toBe('API rate limited')
  })

  it('handles scraper exception', async () => {
    vi.mocked(scrapeGitHub).mockRejectedValue(new Error('Network error'))

    const ctx = createMockContext()
    const result = await runScraper('github', ctx)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Network error')
  })

  it('handles non-Error exception', async () => {
    vi.mocked(scrapeGitHub).mockRejectedValue('String error')

    const ctx = createMockContext()
    const result = await runScraper('github', ctx)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unknown error')
  })
})

describe('runAllScrapers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs all scrapers and returns results map', async () => {
    const githubResult: ScraperResult = { success: true, configsFound: 5, configsAdded: 3 }
    const gitlabResult: ScraperResult = { success: true, configsFound: 10, configsAdded: 7 }
    const gistResult: ScraperResult = { success: true, configsFound: 3, configsAdded: 2 }
    const redditResult: ScraperResult = { success: true, configsFound: 8, configsAdded: 4 }

    vi.mocked(scrapeGitHub).mockResolvedValue(githubResult)
    vi.mocked(scrapeGitLab).mockResolvedValue(gitlabResult)
    vi.mocked(scrapeGists).mockResolvedValue(gistResult)
    vi.mocked(scrapeReddit).mockResolvedValue(redditResult)

    const ctx = createMockContext()
    const results = await runAllScrapers(ctx)

    expect(results.size).toBe(4)
    expect(results.get('github')).toEqual(githubResult)
    expect(results.get('gitlab')).toEqual(gitlabResult)
    expect(results.get('gist')).toEqual(gistResult)
    expect(results.get('reddit')).toEqual(redditResult)
  })

  it('continues running even if one scraper fails', async () => {
    vi.mocked(scrapeGitHub).mockResolvedValue({ success: false, configsFound: 0, configsAdded: 0, error: 'Failed' })
    vi.mocked(scrapeGitLab).mockResolvedValue({ success: true, configsFound: 5, configsAdded: 3 })
    vi.mocked(scrapeGists).mockResolvedValue({ success: true, configsFound: 2, configsAdded: 1 })
    vi.mocked(scrapeReddit).mockResolvedValue({ success: true, configsFound: 4, configsAdded: 2 })

    const ctx = createMockContext()
    const results = await runAllScrapers(ctx)

    expect(results.size).toBe(4)
    expect(results.get('github')?.success).toBe(false)
    expect(results.get('gitlab')?.success).toBe(true)
    expect(results.get('gist')?.success).toBe(true)
    expect(results.get('reddit')?.success).toBe(true)
  })
})
