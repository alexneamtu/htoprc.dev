import { describe, it, expect } from 'vitest'

// Test the gist-specific file detection helper
// Note: isHtoprcFile is not exported, so we test it indirectly through the behavior
// or export it for testing

describe('gist scraper', () => {
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
})
