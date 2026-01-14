import { describe, it, expect } from 'vitest'
import { parseHtoprc } from '../src/parser'

describe('parseHtoprc', () => {
  describe('basic parsing', () => {
    it('parses an empty string and returns default config', () => {
      const result = parseHtoprc('')

      expect(result.config).toBeDefined()
      expect(result.warnings).toEqual([])
      expect(result.errors).toEqual([])
    })

    it('parses color_scheme option', () => {
      const input = 'color_scheme=5'

      const result = parseHtoprc(input)

      expect(result.config.colorScheme).toBe(5)
    })

    it('parses tree_view option', () => {
      const input = 'tree_view=1'

      const result = parseHtoprc(input)

      expect(result.config.treeView).toBe(true)
    })

    it('parses multiple options', () => {
      const input = `color_scheme=3
tree_view=1
hide_kernel_threads=1`

      const result = parseHtoprc(input)

      expect(result.config.colorScheme).toBe(3)
      expect(result.config.treeView).toBe(true)
      expect(result.config.hideKernelThreads).toBe(true)
    })
  })

  describe('comments and empty lines', () => {
    it('ignores comment lines starting with #', () => {
      const input = `# This is a comment
color_scheme=2
# Another comment`

      const result = parseHtoprc(input)

      expect(result.config.colorScheme).toBe(2)
      expect(result.warnings).toEqual([])
    })

    it('ignores empty lines', () => {
      const input = `color_scheme=1

tree_view=1

`

      const result = parseHtoprc(input)

      expect(result.config.colorScheme).toBe(1)
      expect(result.config.treeView).toBe(true)
    })
  })

  describe('warnings for unknown options', () => {
    it('adds warning for unknown options but preserves them', () => {
      const input = 'unknown_option=42'

      const result = parseHtoprc(input)

      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toMatchObject({
        type: 'unknown_option',
        message: expect.stringContaining('unknown_option'),
      })
      expect(result.config.unknownOptions).toEqual({ unknown_option: '42' })
    })
  })

  describe('header meters parsing', () => {
    it('parses left column meters', () => {
      const input = `column_meters_0=AllCPUs Memory Swap`

      const result = parseHtoprc(input)

      expect(result.config.leftMeters).toEqual([
        { type: 'AllCPUs', mode: 'bar' },
        { type: 'Memory', mode: 'bar' },
        { type: 'Swap', mode: 'bar' },
      ])
    })

    it('parses meter modes', () => {
      const input = `column_meters_0=CPU Memory
column_meter_modes_0=1 2`

      const result = parseHtoprc(input)

      expect(result.config.leftMeters).toEqual([
        { type: 'CPU', mode: 'bar' },
        { type: 'Memory', mode: 'text' },
      ])
    })

    it('parses right column meters', () => {
      const input = `column_meters_1=Tasks LoadAverage Uptime
column_meter_modes_1=2 2 2`

      const result = parseHtoprc(input)

      expect(result.config.rightMeters).toEqual([
        { type: 'Tasks', mode: 'text' },
        { type: 'LoadAverage', mode: 'text' },
        { type: 'Uptime', mode: 'text' },
      ])
    })
  })

  describe('fields (columns) parsing', () => {
    it('parses process list fields', () => {
      const input = 'fields=0 48 17 18 38 39 40 2 46 47 49 1'

      const result = parseHtoprc(input)

      expect(result.config.columns).toEqual([0, 48, 17, 18, 38, 39, 40, 2, 46, 47, 49, 1])
    })
  })

  describe('scoring', () => {
    it('returns score 0 for default config', () => {
      const result = parseHtoprc('')

      expect(result.score).toBe(0)
    })

    it('scores custom color scheme +10', () => {
      const input = 'color_scheme=5'

      const result = parseHtoprc(input)

      expect(result.score).toBeGreaterThanOrEqual(10)
    })

    it('scores tree view +5', () => {
      const input = 'tree_view=1'

      const result = parseHtoprc(input)

      expect(result.score).toBeGreaterThanOrEqual(5)
    })
  })

  describe('version detection', () => {
    it('detects htop 3.x format', () => {
      const input = `htop_version=3.2.1
config_reader_min_version=3`

      const result = parseHtoprc(input)

      expect(result.version).toBe('v3')
    })

    it('returns unknown for configs without version', () => {
      const input = 'color_scheme=1'

      const result = parseHtoprc(input)

      expect(result.version).toBe('unknown')
    })
  })
})
