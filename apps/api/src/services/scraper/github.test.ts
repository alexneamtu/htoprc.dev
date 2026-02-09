import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createContentHash,
  shouldFlagConfig,
  generateSlug,
  processScrapedConfig,
  fetchGitHubContent,
  searchGitHub,
  extractConfigFromSearchItem,
  scrapeGitHub,
} from './github'
import type { ParseResult } from '@htoprc/parser'
import type { ScraperContext, GitHubSearchItem } from './types'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const createMockParseResult = (overrides: Partial<ParseResult> = {}): ParseResult => ({
  config: {
    colorScheme: 0,
    headerLayout: 'two_50_50',
    leftMeters: [],
    rightMeters: [],
    columns: [],
    treeView: false,
    hideKernelThreads: false,
    hideUserlandThreads: false,
    shadowOtherUsers: false,
    showThreadNames: false,
    showProgramPath: true,
    highlightBaseName: false,
    highlightDeletedExe: false,
    highlightMegabytes: false,
    highlightThreads: true,
    highlightChanges: false,
    highlightChangesDelaySecs: 5,
    findCommInCmdline: false,
    stripExeFromCmdline: false,
    showMergedCommand: false,
    updateProcessNames: false,
    accountGuestInCpuMeter: false,
    enableMouse: true,
    delay: 15,
    hideFunctionBar: 0,
    headerMargin: true,
    sortKey: 0,
    sortDirection: 'desc',
    treeSortKey: 0,
    treeSortDirection: 'asc',
    treeViewAlwaysByPid: false,
    allBranchesCollapsed: false,
    screenTabs: false,
    detailedCpuTime: false,
    cpuCountFromOne: false,
    showCpuUsage: false,
    showCpuFrequency: false,
    showCpuTemperature: false,
    hideRunningInContainer: false,
    shadowDistributionPathPrefix: false,
    showCachedMemory: false,
    topologyAffinity: false,
    degreeFahrenheit: false,
    screens: [],
    unknownOptions: {},
  },
  warnings: [],
  errors: [],
  version: 'v3',
  score: 10,
  ...overrides,
})

describe('github scraper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createContentHash', () => {
    it('creates consistent hash for same content', async () => {
      const content = 'htop_version=3\ncolor_scheme=0'
      const hash1 = await createContentHash(content)
      const hash2 = await createContentHash(content)
      expect(hash1).toBe(hash2)
    })

    it('creates different hash for different content', async () => {
      const hash1 = await createContentHash('content1')
      const hash2 = await createContentHash('content2')
      expect(hash1).not.toBe(hash2)
    })

    it('returns 64-character hex string', async () => {
      const hash = await createContentHash('some content')
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('shouldFlagConfig', () => {
    it('flags config with parse errors', () => {
      const parseResult = createMockParseResult({
        errors: [{ message: 'Invalid syntax', line: 1 }],
      })
      const result = shouldFlagConfig(parseResult, 10)
      expect(result.shouldFlag).toBe(true)
      expect(result.reason).toContain('Parse error')
    })

    it('flags config with low score', () => {
      const parseResult = createMockParseResult({ score: 3 })
      const result = shouldFlagConfig(parseResult, 10)
      expect(result.shouldFlag).toBe(true)
      expect(result.reason).toContain('score')
    })

    it('flags config that is too short', () => {
      const parseResult = createMockParseResult({ score: 10 })
      const result = shouldFlagConfig(parseResult, 3)
      expect(result.shouldFlag).toBe(true)
      expect(result.reason).toContain('short')
    })

    it('does not flag valid config with good score', () => {
      const parseResult = createMockParseResult({ score: 15 })
      const result = shouldFlagConfig(parseResult, 20)
      expect(result.shouldFlag).toBe(false)
      expect(result.reason).toBeUndefined()
    })

    it('does not flag config at minimum valid score', () => {
      const parseResult = createMockParseResult({ score: 5 })
      const result = shouldFlagConfig(parseResult, 5)
      expect(result.shouldFlag).toBe(false)
    })
  })

  describe('generateSlug', () => {
    it('generates slug from repository name', () => {
      const slug = generateSlug('user/dotfiles', 'htoprc')
      expect(slug).toMatch(/^user-dotfiles-[a-z0-9]{8}$/)
    })

    it('handles special characters in repo name', () => {
      const slug = generateSlug('user/my_awesome.dotfiles', 'config')
      expect(slug).toMatch(/^user-my-awesome-dotfiles-[a-z0-9]{8}$/)
    })

    it('generates unique slugs for same input', () => {
      const slug1 = generateSlug('user/repo', 'file')
      const slug2 = generateSlug('user/repo', 'file')
      expect(slug1).not.toBe(slug2)
    })

    it('handles long repository names', () => {
      const longName = 'user/' + 'a'.repeat(100)
      const slug = generateSlug(longName, 'file')
      expect(slug.length).toBeLessThan(80)
    })
  })

  describe('processScrapedConfig', () => {
    const validConfig = `# htop 3.x config
htop_version=3
config_reader_min_version=3
fields=0 48 17 18 38 39 40 2 46 47 49 1
hide_kernel_threads=1
hide_userland_threads=0
shadow_other_users=0
show_thread_names=0
show_program_path=1
highlight_base_name=1
highlight_deleted_exe=1
highlight_megabytes=1
highlight_threads=1
highlight_changes=0
highlight_changes_delay_secs=5
find_comm_in_cmdline=1
strip_exe_from_cmdline=1
show_merged_command=0
header_margin=1
screen_tabs=0
detailed_cpu_time=0
cpu_count_from_one=0
show_cpu_usage=1
show_cpu_frequency=0
show_cpu_temperature=0
color_scheme=0
enable_mouse=1
delay=15
hide_function_bar=0
header_layout=two_50_50
column_meters_0=LeftCPUs2 Memory Swap
column_meter_modes_0=1 1 1
column_meters_1=RightCPUs2 Tasks LoadAverage Uptime Battery Hostname
column_meter_modes_1=1 2 2 2 2 2
tree_view=1
sort_key=46
tree_sort_key=0
sort_direction=-1
tree_sort_direction=1
tree_view_always_by_pid=0
all_branches_collapsed=0`

    it('processes valid config correctly', async () => {
      const scrapedConfig = {
        content: validConfig,
        sourceUrl: 'https://github.com/user/repo/blob/main/.config/htop/htoprc',
        sourcePlatform: 'github' as const,
        author: 'testuser',
        title: 'dotfiles',
      }

      const result = await processScrapedConfig(scrapedConfig)

      expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/)
      expect(result.config).toBe(scrapedConfig)
      expect(result.parseResult).toBeDefined()
      expect(result.parseResult.score).toBeGreaterThan(0)
    })

    it('flags invalid config', async () => {
      const content = 'x'
      const scrapedConfig = {
        content,
        sourceUrl: 'https://github.com/user/repo',
        sourcePlatform: 'github' as const,
      }

      const result = await processScrapedConfig(scrapedConfig)

      expect(result.status).toBe('flagged')
      expect(result.flagReason).toBeDefined()
    })

    it('publishes valid config with good score', async () => {
      const scrapedConfig = {
        content: validConfig,
        sourceUrl: 'https://github.com/user/repo',
        sourcePlatform: 'github' as const,
      }

      const result = await processScrapedConfig(scrapedConfig)

      expect(result.status).toBe('published')
      expect(result.flagReason).toBeUndefined()
    })
  })

  describe('fetchGitHubContent', () => {
    it('returns content on successful response', async () => {
      const mockContent = 'htop_version=3\ncolor_scheme=0'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockContent),
      })

      const result = await fetchGitHubContent('https://github.com/user/repo/blob/main/.htoprc')

      expect(result).toBe(mockContent)
    })

    it('converts github URL to raw URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('content'),
      })

      await fetchGitHubContent('https://github.com/user/repo/blob/main/.htoprc')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/user/repo/main/.htoprc',
        expect.any(Object)
      )
    })

    it('includes auth token when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('content'),
      })

      await fetchGitHubContent('https://github.com/user/repo/blob/main/.htoprc', 'my-token')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token my-token',
          }),
        })
      )
    })

    it('returns null on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const result = await fetchGitHubContent('https://github.com/user/repo/blob/main/.htoprc')

      expect(result).toBeNull()
    })

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await fetchGitHubContent('https://github.com/user/repo/blob/main/.htoprc')

      expect(result).toBeNull()
    })
  })

  describe('searchGitHub', () => {
    it('returns search results on successful response', async () => {
      const mockResults = {
        total_count: 1,
        items: [{ name: 'htoprc', html_url: 'https://github.com/user/repo' }],
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResults),
      })

      const result = await searchGitHub('filename:htoprc', 'token')

      expect(result).toEqual(mockResults)
    })

    it('includes auth token in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      })

      await searchGitHub('filename:htoprc', 'my-token')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token my-token',
          }),
        })
      )
    })

    it('includes page parameter in URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      })

      await searchGitHub('filename:htoprc', 'token', 3)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=3'),
        expect.any(Object)
      )
    })

    it('returns null on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      })

      const result = await searchGitHub('filename:htoprc', 'token')

      expect(result).toBeNull()
    })

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await searchGitHub('filename:htoprc', 'token')

      expect(result).toBeNull()
    })
  })

  describe('extractConfigFromSearchItem', () => {
    it('extracts config metadata from search item', () => {
      const item: GitHubSearchItem = {
        name: 'htoprc',
        path: '.config/htop/htoprc',
        sha: 'abc123',
        url: 'https://api.github.com/repos/user/dotfiles/contents/.config/htop/htoprc',
        html_url: 'https://github.com/user/dotfiles/blob/main/.config/htop/htoprc',
        repository: {
          id: 12345,
          full_name: 'user/dotfiles',
          html_url: 'https://github.com/user/dotfiles',
          owner: { login: 'user' },
        },
      }

      const result = extractConfigFromSearchItem(item)

      expect(result.sourceUrl).toBe(item.html_url)
      expect(result.sourcePlatform).toBe('github')
      expect(result.author).toBe('user')
      expect(result.title).toBe('user/dotfiles/.config/htop/htoprc')
      expect(result.content).toBe('')
    })
  })

  describe('scrapeGitHub', () => {
    function createMockDb() {
      return {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ success: true }),
            first: vi.fn().mockResolvedValue(null),
          }),
        }),
      }
    }

    it('returns error when GitHub token is not configured', async () => {
      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
      }

      const result = await scrapeGitHub(ctx)

      expect(result.success).toBe(false)
      expect(result.error).toBe('GitHub token not configured')
    })

    it('returns error when search fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      })

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
        githubToken: 'test-token',
      }

      const result = await scrapeGitHub(ctx)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to search GitHub')
    })

    it('returns success with zero configs when no results found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ total_count: 0, items: [] }),
      })

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
        githubToken: 'test-token',
      }

      const result = await scrapeGitHub(ctx)

      expect(result.success).toBe(true)
      expect(result.configsFound).toBe(0)
      expect(result.configsAdded).toBe(0)
    })

    it('processes search results and adds new configs', async () => {
      const htoprcContent = `htop_version=3
fields=0 48 17 18 38
color_scheme=0
tree_view=1
show_program_path=1
highlight_base_name=1
hide_kernel_threads=1`

      // Search returns results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            total_count: 1,
            items: [
              {
                name: 'htoprc',
                path: '.config/htop/htoprc',
                sha: 'abc123',
                html_url: 'https://github.com/user/dotfiles/blob/main/.config/htop/htoprc',
                repository: {
                  full_name: 'user/dotfiles',
                  owner: { login: 'user' },
                },
              },
            ],
          }),
      })

      // File content fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(htoprcContent),
      })

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
        githubToken: 'test-token',
      }

      const result = await scrapeGitHub(ctx)

      expect(result.success).toBe(true)
      expect(result.configsFound).toBe(1)
      expect(result.configsAdded).toBe(1)
    })

    it('skips configs when content fetch fails', async () => {
      // Search returns results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            total_count: 1,
            items: [
              {
                name: 'htoprc',
                path: '.htoprc',
                sha: 'abc123',
                html_url: 'https://github.com/user/repo/blob/main/.htoprc',
                repository: {
                  full_name: 'user/repo',
                  owner: { login: 'user' },
                },
              },
            ],
          }),
      })

      // Content fetch fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
        githubToken: 'test-token',
      }

      const result = await scrapeGitHub(ctx)

      expect(result.success).toBe(true)
      expect(result.configsFound).toBe(1)
      expect(result.configsAdded).toBe(0)
    })

    it('skips duplicate configs by URL', async () => {
      const htoprcContent = `htop_version=3
fields=0 48 17
color_scheme=0
tree_view=1`

      // Search returns results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            total_count: 1,
            items: [
              {
                name: 'htoprc',
                path: '.htoprc',
                sha: 'abc123',
                html_url: 'https://github.com/user/repo/blob/main/.htoprc',
                repository: {
                  full_name: 'user/repo',
                  owner: { login: 'user' },
                },
              },
            ],
          }),
      })

      // Content fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(htoprcContent),
      })

      // Mock DB to return existing URL
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ success: true }),
            first: vi.fn().mockResolvedValue({ id: 'existing-id' }), // URL already exists
          }),
        }),
      }

      const ctx: ScraperContext = {
        db: mockDb as unknown as D1Database,
        githubToken: 'test-token',
      }

      const result = await scrapeGitHub(ctx)

      expect(result.success).toBe(true)
      expect(result.configsFound).toBe(1)
      expect(result.configsAdded).toBe(0)
    })

    it('handles search failure gracefully', async () => {
      // Search returns null (error handled internally by searchGitHub)
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
        githubToken: 'test-token',
      }

      const result = await scrapeGitHub(ctx)

      // searchGitHub catches errors and returns null, then scrapeGitHub returns the "Failed to search" error
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to search GitHub')
    })
  })
})
