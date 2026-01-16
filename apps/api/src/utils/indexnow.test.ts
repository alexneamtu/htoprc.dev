import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { submitConfigToIndexNow } from './indexnow'

describe('IndexNow', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  describe('submitConfigToIndexNow', () => {
    it('submits URL to IndexNow for production', async () => {
      await submitConfigToIndexNow('my-config-slug')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('api.indexnow.org/indexnow')
      expect(url).toContain(encodeURIComponent('https://htoprc.dev/config/my-config-slug'))
    })

    it('skips submission for non-production baseUrl', async () => {
      await submitConfigToIndexNow('my-config-slug', 'https://staging.htoprc.dev')

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('skips submission for localhost', async () => {
      await submitConfigToIndexNow('my-config-slug', 'http://localhost:8787')

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('submits when baseUrl is production', async () => {
      await submitConfigToIndexNow('my-config-slug', 'https://htoprc.dev')

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('handles fetch errors silently', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      // Should not throw
      await expect(submitConfigToIndexNow('my-config-slug')).resolves.toBeUndefined()
    })

    it('handles non-ok response silently', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockFetch.mockResolvedValue({ ok: false, status: 400 })

      await submitConfigToIndexNow('my-config-slug')

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
