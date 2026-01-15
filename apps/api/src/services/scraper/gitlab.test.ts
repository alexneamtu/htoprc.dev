import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  searchGitLab,
  fetchGitLabProject,
  fetchGitLabFileContent,
  scrapeGitLab,
} from './gitlab'
import type { ScraperContext } from './types'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('gitlab scraper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GitLab API URL construction', () => {
    const GITLAB_API_BASE = 'https://gitlab.com/api/v4'

    it('constructs correct search URL', () => {
      const query = 'filename:htoprc'
      const page = 1
      const url = `${GITLAB_API_BASE}/search?scope=blobs&search=${encodeURIComponent(query)}&per_page=20&page=${page}`
      expect(url).toBe('https://gitlab.com/api/v4/search?scope=blobs&search=filename%3Ahtoprc&per_page=20&page=1')
    })

    it('constructs correct project URL', () => {
      const projectId = 12345
      const url = `${GITLAB_API_BASE}/projects/${projectId}`
      expect(url).toBe('https://gitlab.com/api/v4/projects/12345')
    })

    it('constructs correct file content URL', () => {
      const projectId = 12345
      const filePath = '.config/htop/htoprc'
      const ref = 'main'
      const encodedPath = encodeURIComponent(filePath)
      const url = `${GITLAB_API_BASE}/projects/${projectId}/repository/files/${encodedPath}/raw?ref=${ref}`
      expect(url).toBe('https://gitlab.com/api/v4/projects/12345/repository/files/.config%2Fhtop%2Fhtoprc/raw?ref=main')
    })
  })

  describe('searchGitLab', () => {
    it('returns search results on successful response', async () => {
      const mockResults = [
        { project_id: 123, path: '.htoprc', ref: 'main', filename: 'htoprc' },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResults),
      })

      const result = await searchGitLab('filename:htoprc')

      expect(result).toEqual(mockResults)
    })

    it('includes auth token when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await searchGitLab('filename:htoprc', 'my-token')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'PRIVATE-TOKEN': 'my-token',
          }),
        })
      )
    })

    it('returns null on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      const result = await searchGitLab('filename:htoprc')

      expect(result).toBeNull()
    })

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await searchGitLab('filename:htoprc')

      expect(result).toBeNull()
    })
  })

  describe('fetchGitLabProject', () => {
    it('returns project on successful response', async () => {
      const mockProject = {
        id: 123,
        web_url: 'https://gitlab.com/user/repo',
        path_with_namespace: 'user/repo',
        namespace: { path: 'user' },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProject),
      })

      const result = await fetchGitLabProject(123)

      expect(result).toEqual(mockProject)
    })

    it('includes auth token when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await fetchGitLabProject(123, 'my-token')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'PRIVATE-TOKEN': 'my-token',
          }),
        })
      )
    })

    it('returns null on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const result = await fetchGitLabProject(123)

      expect(result).toBeNull()
    })

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await fetchGitLabProject(123)

      expect(result).toBeNull()
    })
  })

  describe('fetchGitLabFileContent', () => {
    it('returns content on successful response', async () => {
      const mockContent = 'htop_version=3\ncolor_scheme=0'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockContent),
      })

      const result = await fetchGitLabFileContent(123, '.htoprc', 'main')

      expect(result).toBe(mockContent)
    })

    it('includes auth token when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('content'),
      })

      await fetchGitLabFileContent(123, '.htoprc', 'main', 'my-token')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'PRIVATE-TOKEN': 'my-token',
          }),
        })
      )
    })

    it('returns null on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const result = await fetchGitLabFileContent(123, '.htoprc', 'main')

      expect(result).toBeNull()
    })

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await fetchGitLabFileContent(123, '.htoprc', 'main')

      expect(result).toBeNull()
    })
  })

  describe('scrapeGitLab', () => {
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

    it('returns error when search fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      })

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
      }

      const result = await scrapeGitLab(ctx)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to search GitLab')
    })

    it('returns success with zero configs when no results found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
      }

      const result = await scrapeGitLab(ctx)

      expect(result.success).toBe(true)
      expect(result.configsFound).toBe(0)
      expect(result.configsAdded).toBe(0)
    })

    it('handles network error in search', async () => {
      // When searchGitLab throws (not returns null), it's caught by the try-catch
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
      }

      const result = await scrapeGitLab(ctx)

      // searchGitLab catches the error and returns null, then scrapeGitLab returns the "Failed to search" error
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to search GitLab')
    })

    it('processes found search results successfully', async () => {
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
          Promise.resolve([
            {
              project_id: 12345,
              path: '.config/htop/htoprc',
              ref: 'main',
              filename: 'htoprc',
            },
          ]),
      })

      // Project fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 12345,
            web_url: 'https://gitlab.com/user/dotfiles',
            path_with_namespace: 'user/dotfiles',
            namespace: { path: 'user' },
          }),
      })

      // File content fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(htoprcContent),
      })

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
        gitlabToken: 'test-token',
      }

      const result = await scrapeGitLab(ctx)

      expect(result.success).toBe(true)
      expect(result.configsFound).toBe(1)
      expect(result.configsAdded).toBe(1)
    })

    it('skips results when project fetch fails', async () => {
      // Search returns results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              project_id: 12345,
              path: '.config/htop/htoprc',
              ref: 'main',
              filename: 'htoprc',
            },
          ]),
      })

      // Project fetch fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
        gitlabToken: 'test-token',
      }

      const result = await scrapeGitLab(ctx)

      expect(result.success).toBe(true)
      expect(result.configsFound).toBe(1)
      expect(result.configsAdded).toBe(0)
    })

    it('skips results when file content fetch fails', async () => {
      // Search returns results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              project_id: 12345,
              path: '.config/htop/htoprc',
              ref: 'main',
              filename: 'htoprc',
            },
          ]),
      })

      // Project fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 12345,
            web_url: 'https://gitlab.com/user/dotfiles',
            path_with_namespace: 'user/dotfiles',
            namespace: { path: 'user' },
          }),
      })

      // File content fetch fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
        gitlabToken: 'test-token',
      }

      const result = await scrapeGitLab(ctx)

      expect(result.success).toBe(true)
      expect(result.configsFound).toBe(1)
      expect(result.configsAdded).toBe(0)
    })
  })
})
