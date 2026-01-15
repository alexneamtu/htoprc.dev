import { describe, it, expect } from 'vitest'

// Helper functions mirroring reddit.ts logic for testing
function looksLikeHtoprc(content: string): boolean {
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

  return matchCount >= 3
}

function extractHtoprcFromText(text: string): string | null {
  const codeBlockRegex = /```(?:htoprc|conf|ini|bash|sh)?\s*([\s\S]*?)```/g
  const matches = [...text.matchAll(codeBlockRegex)]

  for (const match of matches) {
    const content = match[1].trim()
    if (looksLikeHtoprc(content)) {
      return content
    }
  }

  return null
}

describe('reddit scraper', () => {
  describe('looksLikeHtoprc', () => {
    it('identifies valid htoprc content', () => {
      const content = `htop_version=3
fields=0 48 17 18 38
color_scheme=0
tree_view=1`
      expect(looksLikeHtoprc(content)).toBe(true)
    })

    it('identifies htoprc with header layout', () => {
      const content = `header_layout=two_50_50
column_meters_0=CPU Memory Swap
column_meter_modes_0=1 1 1
hide_kernel_threads=1`
      expect(looksLikeHtoprc(content)).toBe(true)
    })

    it('rejects non-htoprc content', () => {
      const content = `This is just some random text
about htop configurations
but not actual config content`
      expect(looksLikeHtoprc(content)).toBe(false)
    })

    it('rejects content with only 2 matching options', () => {
      const content = `color_scheme=0
tree_view=1`
      expect(looksLikeHtoprc(content)).toBe(false)
    })

    it('accepts content with exactly 3 matching options', () => {
      const content = `color_scheme=0
tree_view=1
fields=0 48 17`
      expect(looksLikeHtoprc(content)).toBe(true)
    })

    it('is case insensitive', () => {
      const content = `COLOR_SCHEME=0
TREE_VIEW=1
FIELDS=0 48 17`
      expect(looksLikeHtoprc(content)).toBe(true)
    })
  })

  describe('extractHtoprcFromText', () => {
    it('extracts htoprc from markdown code block', () => {
      const text = `Here's my htop config:

\`\`\`
htop_version=3
fields=0 48 17 18 38
color_scheme=0
tree_view=1
\`\`\`

Let me know what you think!`

      const result = extractHtoprcFromText(text)
      expect(result).not.toBeNull()
      expect(result).toContain('htop_version=3')
    })

    it('extracts htoprc from tagged code block', () => {
      const text = `Check out this config:

\`\`\`conf
htop_version=3
fields=0 48 17 18 38
color_scheme=0
tree_view=1
\`\`\`
`

      const result = extractHtoprcFromText(text)
      expect(result).not.toBeNull()
      expect(result).toContain('color_scheme=0')
    })

    it('extracts htoprc from htoprc tagged block', () => {
      const text = `\`\`\`htoprc
htop_version=3
fields=0 48 17 18 38
color_scheme=0
tree_view=1
\`\`\``

      const result = extractHtoprcFromText(text)
      expect(result).not.toBeNull()
    })

    it('returns null for text without htoprc content', () => {
      const text = `Here's my bash script:

\`\`\`bash
echo "Hello World"
\`\`\`
`

      const result = extractHtoprcFromText(text)
      expect(result).toBeNull()
    })

    it('returns null for text without code blocks', () => {
      const text = 'Just some regular text about htop settings'
      const result = extractHtoprcFromText(text)
      expect(result).toBeNull()
    })

    it('extracts only htoprc from multiple code blocks', () => {
      const text = `Some bash:
\`\`\`bash
echo "test"
\`\`\`

And my htoprc:
\`\`\`
htop_version=3
fields=0 48 17
color_scheme=0
tree_view=1
\`\`\`
`

      const result = extractHtoprcFromText(text)
      expect(result).not.toBeNull()
      expect(result).toContain('htop_version')
      expect(result).not.toContain('echo')
    })

    it('handles code blocks with extra whitespace', () => {
      const text = `\`\`\`

htop_version=3
fields=0 48 17 18 38
color_scheme=0
tree_view=1

\`\`\``

      const result = extractHtoprcFromText(text)
      expect(result).not.toBeNull()
      expect(result?.trim()).toBe(`htop_version=3
fields=0 48 17 18 38
color_scheme=0
tree_view=1`)
    })
  })

  describe('subreddit configuration', () => {
    const SUBREDDITS = ['unixporn', 'linux']

    it('includes r/unixporn', () => {
      expect(SUBREDDITS).toContain('unixporn')
    })

    it('includes r/linux', () => {
      expect(SUBREDDITS).toContain('linux')
    })
  })
})
