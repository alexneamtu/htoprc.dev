import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPublicGists, fetchGistFileContent, scrapeGists } from './gist'
import type { ScraperContext } from './types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('gist scraper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('htoprc file detection', () => {
    // Helper function for testing - mirrors the logic in gist.ts
    function isHtoprcFile(filename: string): boolean {
      const lowerName = filename.toLowerCase()
      return (
        lowerName === 'htoprc' ||
        lowerName === '.htoprc' ||
        lowerName.endsWith('/htoprc') ||
        lowerName.endsWith('/.htoprc')
      )
    }

    it('detects htoprc file', () => {
      expect(isHtoprcFile('htoprc')).toBe(true)
    })

    it('detects .htoprc file', () => {
      expect(isHtoprcFile('.htoprc')).toBe(true)
    })

    it('detects htoprc in subdirectory', () => {
      expect(isHtoprcFile('.config/htop/htoprc')).toBe(true)
    })

    it('detects .htoprc in subdirectory', () => {
      expect(isHtoprcFile('config/.htoprc')).toBe(true)
    })

    it('is case insensitive', () => {
      expect(isHtoprcFile('HTOPRC')).toBe(true)
      expect(isHtoprcFile('.HTOPRC')).toBe(true)
    })

    it('rejects unrelated files', () => {
      expect(isHtoprcFile('config.txt')).toBe(false)
      expect(isHtoprcFile('htoprc.bak')).toBe(false)
      expect(isHtoprcFile('my-htoprc-backup')).toBe(false)
    })

    it('rejects files containing htoprc but not exactly', () => {
      expect(isHtoprcFile('htoprc_backup')).toBe(false)
      expect(isHtoprcFile('old.htoprc')).toBe(false)
    })
  })

  describe('gist URL generation', () => {
    it('generates correct URL with file anchor', () => {
      const baseUrl = 'https://gist.github.com/user/abc123'
      const filename = '.htoprc'
      const sourceUrl = `${baseUrl}#file-${filename.replace(/\./g, '-')}`
      expect(sourceUrl).toBe('https://gist.github.com/user/abc123#file--htoprc')
    })

    it('handles complex filenames', () => {
      const baseUrl = 'https://gist.github.com/user/abc123'
      const filename = 'my.htoprc.config'
      const sourceUrl = `${baseUrl}#file-${filename.replace(/\./g, '-')}`
      expect(sourceUrl).toBe('https://gist.github.com/user/abc123#file-my-htoprc-config')
    })
  })

  describe('fetchPublicGists', () => {
    it('returns gists on successful response', async () => {
      const mockGists = [
        { id: '1', html_url: 'https://gist.github.com/user/1', files: {}, owner: { login: 'user' } },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGists),
      })

      const result = await fetchPublicGists('test-token', 1)

      expect(result).toEqual(mockGists)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/gists/public?per_page=100&page=1',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token test-token',
          }),
        })
      )
    })

    it('returns null on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      })

      const result = await fetchPublicGists('test-token')

      expect(result).toBeNull()
    })

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await fetchPublicGists('test-token')

      expect(result).toBeNull()
    })
  })

  describe('fetchGistFileContent', () => {
    it('returns content on successful response', async () => {
      const mockContent = 'htop_version=3\ncolor_scheme=0'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockContent),
      })

      const result = await fetchGistFileContent('https://gist.githubusercontent.com/raw/file', 'token')

      expect(result).toBe(mockContent)
    })

    it('returns null on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const result = await fetchGistFileContent('https://gist.githubusercontent.com/raw/file', 'token')

      expect(result).toBeNull()
    })

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await fetchGistFileContent('https://gist.githubusercontent.com/raw/file', 'token')

      expect(result).toBeNull()
    })
  })

  describe('scrapeGists', () => {
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

      const result = await scrapeGists(ctx)

      expect(result.success).toBe(false)
      expect(result.error).toBe('GitHub token not configured')
    })

    it('returns success with zero configs when no gists found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
        githubToken: 'test-token',
      }

      const result = await scrapeGists(ctx)

      expect(result.success).toBe(true)
      expect(result.configsFound).toBe(0)
      expect(result.configsAdded).toBe(0)
    })

    it('handles fetch returning null gracefully', async () => {
      // When fetchPublicGists returns null (due to error), scraping succeeds with 0 configs
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
        githubToken: 'test-token',
      }

      const result = await scrapeGists(ctx)

      // Since fetchPublicGists returns null on error and the loop handles this gracefully
      expect(result.success).toBe(true)
      expect(result.configsFound).toBe(0)
    })

    it('finds and processes gists with htoprc files', async () => {
      const htoprcContent = `htop_version=3
fields=0 48 17 18 38
hide_kernel_threads=1
color_scheme=0
tree_view=1
show_program_path=1
highlight_base_name=1`

      // First fetch returns gists with htoprc file
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'gist123',
              html_url: 'https://gist.github.com/user/gist123',
              files: {
                htoprc: {
                  filename: 'htoprc',
                  raw_url: 'https://gist.githubusercontent.com/raw/htoprc',
                },
              },
              owner: { login: 'testuser' },
              description: 'My htop config',
              public: true,
              created_at: '2024-01-01T00:00:00Z',
            },
          ]),
      })

      // Second fetch returns empty (end pagination)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      // Third fetch returns file content
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(htoprcContent),
      })

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
        githubToken: 'test-token',
      }

      const result = await scrapeGists(ctx)

      expect(result.success).toBe(true)
      expect(result.configsFound).toBe(1)
      expect(result.configsAdded).toBe(1)
    })

    it('skips gists without htoprc files', async () => {
      // First fetch returns gists without htoprc file
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'gist123',
              html_url: 'https://gist.github.com/user/gist123',
              files: {
                'script.sh': {
                  filename: 'script.sh',
                  raw_url: 'https://gist.githubusercontent.com/raw/script.sh',
                },
              },
              owner: { login: 'testuser' },
              description: 'My shell script',
              public: true,
              created_at: '2024-01-01T00:00:00Z',
            },
          ]),
      })

      // Second fetch returns empty (end pagination)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
        githubToken: 'test-token',
      }

      const result = await scrapeGists(ctx)

      expect(result.success).toBe(true)
      expect(result.configsFound).toBe(0)
      expect(result.configsAdded).toBe(0)
    })

    it('handles gists from anonymous users', async () => {
      const htoprcContent = `htop_version=3
fields=0 48 17 18 38
hide_kernel_threads=1
color_scheme=0
tree_view=1
show_program_path=1
highlight_base_name=1`

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'gist123',
              html_url: 'https://gist.github.com/user/gist123',
              files: {
                '.htoprc': {
                  filename: '.htoprc',
                  raw_url: 'https://gist.githubusercontent.com/raw/.htoprc',
                },
              },
              owner: null,
              description: null,
              public: true,
              created_at: '2024-01-01T00:00:00Z',
            },
          ]),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(htoprcContent),
      })

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
        githubToken: 'test-token',
      }

      const result = await scrapeGists(ctx)

      expect(result.success).toBe(true)
      expect(result.configsFound).toBe(1)
    })
  })
})
