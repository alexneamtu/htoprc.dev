import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  searchGitLabProjects,
  listGitLabProjectFiles,
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

    it('constructs correct project search URL', () => {
      const query = 'dotfiles'
      const url = `${GITLAB_API_BASE}/projects?search=${encodeURIComponent(query)}&visibility=public&per_page=20&page=1&order_by=last_activity_at`
      expect(url).toBe('https://gitlab.com/api/v4/projects?search=dotfiles&visibility=public&per_page=20&page=1&order_by=last_activity_at')
    })

    it('constructs correct project URL', () => {
      const projectId = 12345
      const url = `${GITLAB_API_BASE}/projects/${projectId}`
      expect(url).toBe('https://gitlab.com/api/v4/projects/12345')
    })

    it('constructs correct repository tree URL', () => {
      const projectId = 12345
      const url = `${GITLAB_API_BASE}/projects/${projectId}/repository/tree?recursive=true&per_page=100`
      expect(url).toBe('https://gitlab.com/api/v4/projects/12345/repository/tree?recursive=true&per_page=100')
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

  describe('searchGitLabProjects', () => {
    it('returns projects on successful response', async () => {
      const mockProjects = [
        { id: 123, path_with_namespace: 'user/dotfiles', web_url: 'https://gitlab.com/user/dotfiles' },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjects),
      })

      const result = await searchGitLabProjects('dotfiles')

      expect(result).toEqual(mockProjects)
    })

    it('includes auth token when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await searchGitLabProjects('dotfiles', 'my-token')

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

      const result = await searchGitLabProjects('dotfiles')

      expect(result).toBeNull()
    })

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await searchGitLabProjects('dotfiles')

      expect(result).toBeNull()
    })
  })

  describe('listGitLabProjectFiles', () => {
    it('returns files on successful response', async () => {
      const mockFiles = [
        { id: 'abc', name: 'htoprc', type: 'blob', path: '.config/htop/htoprc', mode: '100644' },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFiles),
      })

      const result = await listGitLabProjectFiles(123)

      expect(result).toEqual(mockFiles)
    })

    it('includes ref in URL when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await listGitLabProjectFiles(123, 'my-token', 'main')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ref=main'),
        expect.any(Object)
      )
    })

    it('returns null on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const result = await listGitLabProjectFiles(123)

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

    it('returns error when project search fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      })

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
      }

      const result = await scrapeGitLab(ctx)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to search GitLab projects')
    })

    it('returns success with zero configs when no projects found', async () => {
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

    it('handles network error in project search', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const ctx: ScraperContext = {
        db: createMockDb() as unknown as D1Database,
      }

      const result = await scrapeGitLab(ctx)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to search GitLab projects')
    })

    it('processes found htoprc files successfully', async () => {
      const htoprcContent = `htop_version=3
fields=0 48 17 18 38
color_scheme=0
tree_view=1
show_program_path=1
highlight_base_name=1
hide_kernel_threads=1`

      // Project search returns results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 12345,
              web_url: 'https://gitlab.com/user/dotfiles',
              path_with_namespace: 'user/dotfiles',
              default_branch: 'main',
              namespace: { path: 'user' },
            },
          ]),
      })

      // List files returns htoprc
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 'abc', name: 'htoprc', type: 'blob', path: '.config/htop/htoprc', mode: '100644' },
            { id: 'def', name: 'bashrc', type: 'blob', path: '.bashrc', mode: '100644' },
          ]),
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

    it('skips projects when file listing fails', async () => {
      // Project search returns results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 12345,
              web_url: 'https://gitlab.com/user/dotfiles',
              path_with_namespace: 'user/dotfiles',
              default_branch: 'main',
              namespace: { path: 'user' },
            },
          ]),
      })

      // List files fails
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
      expect(result.configsFound).toBe(0)
      expect(result.configsAdded).toBe(0)
    })

    it('skips files when content fetch fails', async () => {
      // Project search returns results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 12345,
              web_url: 'https://gitlab.com/user/dotfiles',
              path_with_namespace: 'user/dotfiles',
              default_branch: 'main',
              namespace: { path: 'user' },
            },
          ]),
      })

      // List files returns htoprc
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 'abc', name: 'htoprc', type: 'blob', path: '.htoprc', mode: '100644' },
          ]),
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

    it('filters for htoprc files only', async () => {
      const htoprcContent = `htop_version=3
fields=0 48 17 18 38
color_scheme=0
tree_view=1`

      // Project search returns results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 12345,
              web_url: 'https://gitlab.com/user/dotfiles',
              path_with_namespace: 'user/dotfiles',
              default_branch: 'main',
              namespace: { path: 'user' },
            },
          ]),
      })

      // List files returns mixed files
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 'a', name: 'htoprc', type: 'blob', path: '.htoprc', mode: '100644' },
            { id: 'b', name: '.htoprc', type: 'blob', path: '.config/htop/.htoprc', mode: '100644' },
            { id: 'c', name: 'bashrc', type: 'blob', path: '.bashrc', mode: '100644' },
            { id: 'd', name: 'config', type: 'tree', path: '.config', mode: '040000' },
          ]),
      })

      // File content fetches (called twice for 2 htoprc files)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(htoprcContent),
      })
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
      expect(result.configsFound).toBe(2) // Only htoprc files
    })
  })
})
