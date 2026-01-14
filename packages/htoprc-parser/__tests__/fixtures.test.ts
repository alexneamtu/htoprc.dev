import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { parseHtoprc } from '../src/parser'

const FIXTURES_DIR = join(__dirname, 'fixtures')

describe('fixture files', () => {
  const fixtureFiles = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.htoprc'))

  describe('all fixtures parse without errors', () => {
    fixtureFiles.forEach((filename) => {
      it(`parses ${filename} without fatal errors`, () => {
        const content = readFileSync(join(FIXTURES_DIR, filename), 'utf-8')
        const result = parseHtoprc(content)

        expect(result.errors).toEqual([])
        expect(result.config).toBeDefined()
      })
    })
  })

  describe('htop-v3-colorful.htoprc', () => {
    const content = readFileSync(join(FIXTURES_DIR, 'htop-v3-colorful.htoprc'), 'utf-8')
    const result = parseHtoprc(content)

    it('detects v3 version', () => {
      expect(result.version).toBe('v3')
    })

    it('parses color scheme', () => {
      expect(result.config.colorScheme).toBe(5)
    })

    it('has high score (custom color scheme)', () => {
      expect(result.score).toBeGreaterThanOrEqual(10)
    })

    it('parses left meters', () => {
      expect(result.config.leftMeters.length).toBeGreaterThan(0)
    })

    it('parses right meters', () => {
      expect(result.config.rightMeters.length).toBeGreaterThan(0)
    })
  })

  describe('htop-v3-tree-view.htoprc', () => {
    const content = readFileSync(join(FIXTURES_DIR, 'htop-v3-tree-view.htoprc'), 'utf-8')
    const result = parseHtoprc(content)

    it('detects tree view', () => {
      expect(result.config.treeView).toBe(true)
    })

    it('has score for tree view', () => {
      expect(result.score).toBeGreaterThanOrEqual(5)
    })

    it('parses custom delay', () => {
      expect(result.config.delay).toBe(10)
    })
  })

  describe('htop-v3-minimal.htoprc', () => {
    const content = readFileSync(join(FIXTURES_DIR, 'htop-v3-minimal.htoprc'), 'utf-8')
    const result = parseHtoprc(content)

    it('detects v3 version', () => {
      expect(result.version).toBe('v3')
    })

    it('has low score (minimal customization)', () => {
      expect(result.score).toBeLessThan(10)
    })
  })

  describe('htop-v3-all-meters.htoprc', () => {
    const content = readFileSync(join(FIXTURES_DIR, 'htop-v3-all-meters.htoprc'), 'utf-8')
    const result = parseHtoprc(content)

    it('parses Midnight Commander color scheme', () => {
      expect(result.config.colorScheme).toBe(4)
    })

    it('parses custom header layout', () => {
      expect(result.config.headerLayout).toBe('two_67_33')
    })

    it('has high score', () => {
      // Custom color scheme (10) + meters (5+5) + custom layout (3) = 23
      expect(result.score).toBeGreaterThanOrEqual(15)
    })
  })

  describe('htop-v2-basic.htoprc (legacy format)', () => {
    const content = readFileSync(join(FIXTURES_DIR, 'htop-v2-basic.htoprc'), 'utf-8')
    const result = parseHtoprc(content)

    it('parses without fatal errors', () => {
      expect(result.errors).toEqual([])
    })

    it('detects unknown version (v2 format)', () => {
      // v2 format doesn't have config_reader_min_version
      expect(result.version).toBe('unknown')
    })

    it('parses highlight_base_name', () => {
      expect(result.config.highlightBaseName).toBe(true)
    })

    // Note: v2 format uses left_meters/right_meters which we'll add support for
    it('generates warnings for v2-specific options', () => {
      // left_meters, right_meters, etc. are not in our known options list
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })
})
