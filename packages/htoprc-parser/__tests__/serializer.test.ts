import { describe, it, expect } from 'vitest'
import { parseHtoprc, serializeHtoprc, DEFAULT_CONFIG } from '../src'
import type { HtopConfig } from '../src'

describe('serializeHtoprc', () => {
  it('serializes default config', () => {
    const output = serializeHtoprc(DEFAULT_CONFIG)
    expect(output).toContain('color_scheme=0')
    expect(output).toContain('header_layout=two_50_50')
    expect(output).toContain('tree_view=0')
  })

  it('serializes custom color scheme', () => {
    const config: HtopConfig = { ...DEFAULT_CONFIG, colorScheme: 5 }
    const output = serializeHtoprc(config)
    expect(output).toContain('color_scheme=5')
  })

  it('serializes boolean options correctly', () => {
    const config: HtopConfig = {
      ...DEFAULT_CONFIG,
      treeView: true,
      hideKernelThreads: false,
      highlightBaseName: true,
    }
    const output = serializeHtoprc(config)
    expect(output).toContain('tree_view=1')
    expect(output).toContain('hide_kernel_threads=0')
    expect(output).toContain('highlight_base_name=1')
  })

  it('serializes meters', () => {
    const config: HtopConfig = {
      ...DEFAULT_CONFIG,
      leftMeters: [
        { type: 'CPU', mode: 'bar' },
        { type: 'Memory', mode: 'bar' },
      ],
      rightMeters: [
        { type: 'Tasks', mode: 'text' },
        { type: 'LoadAverage', mode: 'text' },
      ],
    }
    const output = serializeHtoprc(config)
    expect(output).toContain('column_meters_0=CPU Memory')
    expect(output).toContain('column_meter_modes_0=1 1')
    expect(output).toContain('column_meters_1=Tasks LoadAverage')
    expect(output).toContain('column_meter_modes_1=2 2')
  })

  it('serializes columns/fields', () => {
    const config: HtopConfig = {
      ...DEFAULT_CONFIG,
      columns: [0, 48, 17, 18, 38, 39, 40, 2, 46, 47, 49, 1],
    }
    const output = serializeHtoprc(config)
    expect(output).toContain('fields=0 48 17 18 38 39 40 2 46 47 49 1')
  })

  it('serializes sort direction', () => {
    const configAsc: HtopConfig = { ...DEFAULT_CONFIG, sortDirection: 'asc' }
    const configDesc: HtopConfig = { ...DEFAULT_CONFIG, sortDirection: 'desc' }

    expect(serializeHtoprc(configAsc)).toContain('sort_direction=1')
    expect(serializeHtoprc(configDesc)).toContain('sort_direction=-1')
  })

  it('serializes screen definitions', () => {
    const config: HtopConfig = {
      ...DEFAULT_CONFIG,
      screens: [
        {
          name: 'Main',
          columns: ['PID', 'USER', 'PRIORITY', 'NICE', 'M_VIRT'],
          sortKey: 'PERCENT_CPU',
          sortDirection: 'desc',
          treeView: false,
        },
        {
          name: 'I/O',
          columns: ['PID', 'USER', 'IO_READ_RATE', 'IO_WRITE_RATE'],
        },
      ],
    }
    const output = serializeHtoprc(config)
    expect(output).toContain('screen:Main=PID USER PRIORITY NICE M_VIRT')
    expect(output).toContain('.sort_key=PERCENT_CPU')
    expect(output).toContain('.sort_direction=-1')
    expect(output).toContain('.tree_view=0')
    expect(output).toContain('screen:I/O=PID USER IO_READ_RATE IO_WRITE_RATE')
  })

  it('preserves unknown options', () => {
    const config: HtopConfig = {
      ...DEFAULT_CONFIG,
      unknownOptions: {
        future_option: 'some_value',
        another_new_option: '42',
      },
    }
    const output = serializeHtoprc(config)
    expect(output).toContain('future_option=some_value')
    expect(output).toContain('another_new_option=42')
  })

  it('respects includeUnknown option', () => {
    const config: HtopConfig = {
      ...DEFAULT_CONFIG,
      unknownOptions: { future_option: 'value' },
    }
    const output = serializeHtoprc(config, { includeUnknown: false })
    expect(output).not.toContain('future_option')
  })

  it('respects onlyNonDefaults option', () => {
    const config: HtopConfig = {
      ...DEFAULT_CONFIG,
      colorScheme: 5, // non-default
      treeView: false, // default
    }
    const output = serializeHtoprc(config, { onlyNonDefaults: true })
    expect(output).toContain('color_scheme=5')
    expect(output).not.toContain('tree_view=')
  })

  describe('round-trip parsing', () => {
    it('parse -> serialize -> parse produces equivalent config', () => {
      const input = `htop_version=3.2.1
config_reader_min_version=3
fields=0 48 17 18 38 39 40 2 46 47 49 1
hide_kernel_threads=1
hide_userland_threads=0
shadow_other_users=0
show_thread_names=1
show_program_path=1
highlight_base_name=1
highlight_megabytes=1
highlight_threads=1
color_scheme=3
enable_mouse=1
delay=10
header_layout=two_50_50
column_meters_0=AllCPUs8 Memory Swap
column_meter_modes_0=1 1 1
column_meters_1=Tasks LoadAverage Uptime
column_meter_modes_1=2 2 2
tree_view=1
sort_key=46
sort_direction=-1`

      const parsed1 = parseHtoprc(input)
      const serialized = serializeHtoprc(parsed1.config)
      const parsed2 = parseHtoprc(serialized)

      // Compare key config values
      expect(parsed2.config.colorScheme).toBe(parsed1.config.colorScheme)
      expect(parsed2.config.treeView).toBe(parsed1.config.treeView)
      expect(parsed2.config.headerLayout).toBe(parsed1.config.headerLayout)
      expect(parsed2.config.hideKernelThreads).toBe(parsed1.config.hideKernelThreads)
      expect(parsed2.config.highlightBaseName).toBe(parsed1.config.highlightBaseName)
      expect(parsed2.config.columns).toEqual(parsed1.config.columns)
      expect(parsed2.config.leftMeters).toEqual(parsed1.config.leftMeters)
      expect(parsed2.config.rightMeters).toEqual(parsed1.config.rightMeters)
      expect(parsed2.config.sortKey).toBe(parsed1.config.sortKey)
      expect(parsed2.config.sortDirection).toBe(parsed1.config.sortDirection)
    })

    it('handles all fixture files in round-trip', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const fixturesDir = path.join(__dirname, 'fixtures')

      const files = fs.readdirSync(fixturesDir)
      for (const file of files) {
        const content = fs.readFileSync(path.join(fixturesDir, file), 'utf-8')
        const parsed1 = parseHtoprc(content)
        const serialized = serializeHtoprc(parsed1.config)
        const parsed2 = parseHtoprc(serialized)

        // Key values should match
        expect(parsed2.config.colorScheme).toBe(parsed1.config.colorScheme)
        expect(parsed2.config.treeView).toBe(parsed1.config.treeView)
        expect(parsed2.config.columns).toEqual(parsed1.config.columns)
      }
    })
  })
})
