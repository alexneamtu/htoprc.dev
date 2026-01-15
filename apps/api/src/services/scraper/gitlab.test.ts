import { describe, it, expect } from 'vitest'

describe('gitlab scraper', () => {
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

  describe('source URL generation', () => {
    it('generates correct source URL from project and file info', () => {
      const project = {
        web_url: 'https://gitlab.com/user/dotfiles',
      }
      const ref = 'main'
      const path = '.config/htop/htoprc'

      const sourceUrl = `${project.web_url}/-/blob/${ref}/${path}`
      expect(sourceUrl).toBe('https://gitlab.com/user/dotfiles/-/blob/main/.config/htop/htoprc')
    })

    it('handles special characters in path', () => {
      const project = {
        web_url: 'https://gitlab.com/user/repo',
      }
      const ref = 'feature/branch'
      const path = 'configs/htoprc'

      const sourceUrl = `${project.web_url}/-/blob/${ref}/${path}`
      expect(sourceUrl).toBe('https://gitlab.com/user/repo/-/blob/feature/branch/configs/htoprc')
    })
  })

  describe('scraped config creation', () => {
    it('creates correct scraped config structure', () => {
      const content = 'htop_version=3\ncolor_scheme=0'
      const sourceUrl = 'https://gitlab.com/user/dotfiles/-/blob/main/htoprc'
      const project = {
        path_with_namespace: 'user/dotfiles',
        namespace: { path: 'user' },
      }
      const filePath = '.config/htop/htoprc'

      const scrapedConfig = {
        content,
        sourceUrl,
        sourcePlatform: 'gitlab' as const,
        author: project.namespace.path,
        title: `${project.path_with_namespace}/${filePath}`,
      }

      expect(scrapedConfig.content).toBe(content)
      expect(scrapedConfig.sourceUrl).toBe(sourceUrl)
      expect(scrapedConfig.sourcePlatform).toBe('gitlab')
      expect(scrapedConfig.author).toBe('user')
      expect(scrapedConfig.title).toBe('user/dotfiles/.config/htop/htoprc')
    })
  })

  describe('GitLab search result structure', () => {
    it('validates expected search result fields', () => {
      const searchResult = {
        basename: 'htoprc',
        data: 'htop_version=3',
        path: '.config/htop/htoprc',
        filename: 'htoprc',
        id: null,
        ref: 'main',
        startline: 1,
        project_id: 12345,
      }

      expect(searchResult).toHaveProperty('basename')
      expect(searchResult).toHaveProperty('path')
      expect(searchResult).toHaveProperty('filename')
      expect(searchResult).toHaveProperty('ref')
      expect(searchResult).toHaveProperty('project_id')
    })
  })

  describe('GitLab project structure', () => {
    it('validates expected project fields', () => {
      const project = {
        id: 12345,
        path_with_namespace: 'user/dotfiles',
        web_url: 'https://gitlab.com/user/dotfiles',
        namespace: {
          path: 'user',
        },
      }

      expect(project).toHaveProperty('id')
      expect(project).toHaveProperty('path_with_namespace')
      expect(project).toHaveProperty('web_url')
      expect(project).toHaveProperty('namespace')
      expect(project.namespace).toHaveProperty('path')
    })
  })
})
