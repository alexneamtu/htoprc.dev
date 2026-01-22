import { describe, it, expect } from 'vitest'
import { parseHtoprc, serializeHtoprc, DEFAULT_CONFIG } from '../src'
import type { HtopConfig, MeterMode } from '../src'

describe('serializeHtoprc', () => {
  it('serializes default config', () => {
    const output = serializeHtoprc(DEFAULT_CONFIG)
    expect(output).toContain('color_scheme=0')
    expect(output).toContain('header_layout=two_50_50')
    expect(output).toContain('tree_view=0')
  })

  it('returns a string', () => {
    const output = serializeHtoprc(DEFAULT_CONFIG)
    expect(typeof output).toBe('string')
  })

  it('produces newline-separated output', () => {
    const output = serializeHtoprc(DEFAULT_CONFIG)
    expect(output.includes('\n')).toBe(true)
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

  it('serializes all boolean options', () => {
    const config: HtopConfig = {
      ...DEFAULT_CONFIG,
      hideKernelThreads: true,
      hideUserlandThreads: true,
      shadowOtherUsers: true,
      showThreadNames: true,
      showProgramPath: false,
      highlightBaseName: true,
      highlightDeletedExe: false,
      highlightMegabytes: false,
      highlightThreads: false,
      highlightChanges: true,
      findCommInCmdline: false,
      stripExeFromCmdline: false,
      showMergedCommand: true,
      headerMargin: false,
      screenTabs: false,
      detailedCpuTime: true,
      cpuCountFromOne: true,
      showCpuUsage: false,
      showCpuFrequency: true,
      showCpuTemperature: true,
      degreeFahrenheit: true,
      updateProcessNames: true,
      accountGuestInCpuMeter: true,
      enableMouse: false,
      treeView: true,
      treeViewAlwaysByPid: true,
      allBranchesCollapsed: true,
    }
    const output = serializeHtoprc(config)

    expect(output).toContain('hide_kernel_threads=1')
    expect(output).toContain('hide_userland_threads=1')
    expect(output).toContain('shadow_other_users=1')
    expect(output).toContain('show_thread_names=1')
    expect(output).toContain('show_program_path=0')
    expect(output).toContain('highlight_base_name=1')
    expect(output).toContain('highlight_deleted_exe=0')
    expect(output).toContain('highlight_megabytes=0')
    expect(output).toContain('highlight_threads=0')
    expect(output).toContain('highlight_changes=1')
    expect(output).toContain('find_comm_in_cmdline=0')
    expect(output).toContain('strip_exe_from_cmdline=0')
    expect(output).toContain('show_merged_command=1')
    expect(output).toContain('header_margin=0')
    expect(output).toContain('screen_tabs=0')
    expect(output).toContain('detailed_cpu_time=1')
    expect(output).toContain('cpu_count_from_one=1')
    expect(output).toContain('show_cpu_usage=0')
    expect(output).toContain('show_cpu_frequency=1')
    expect(output).toContain('show_cpu_temperature=1')
    expect(output).toContain('degree_fahrenheit=1')
    expect(output).toContain('update_process_names=1')
    expect(output).toContain('account_guest_in_cpu_meter=1')
    expect(output).toContain('enable_mouse=0')
    expect(output).toContain('tree_view=1')
    expect(output).toContain('tree_view_always_by_pid=1')
    expect(output).toContain('all_branches_collapsed=1')
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

  it('serializes all meter modes correctly', () => {
    const config: HtopConfig = {
      ...DEFAULT_CONFIG,
      leftMeters: [
        { type: 'CPU', mode: 'bar' },
        { type: 'Memory', mode: 'text' },
        { type: 'Swap', mode: 'graph' },
        { type: 'Tasks', mode: 'led' },
      ],
    }
    const output = serializeHtoprc(config)
    expect(output).toContain('column_meters_0=CPU Memory Swap Tasks')
    expect(output).toContain('column_meter_modes_0=1 2 3 4')
  })

  it('does not serialize empty meter arrays', () => {
    const config: HtopConfig = {
      ...DEFAULT_CONFIG,
      leftMeters: [],
      rightMeters: [],
    }
    const output = serializeHtoprc(config)
    expect(output).not.toContain('column_meters_0')
    expect(output).not.toContain('column_meters_1')
  })

  it('handles unknown meter mode gracefully (falls back to bar=1)', () => {
    const config: HtopConfig = {
      ...DEFAULT_CONFIG,
      leftMeters: [{ type: 'CPU', mode: 'invalid_mode' as MeterMode }],
    }
    const output = serializeHtoprc(config)
    expect(output).toContain('column_meter_modes_0=1')
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

  it('serializes tree sort direction', () => {
    const configAsc: HtopConfig = { ...DEFAULT_CONFIG, treeSortDirection: 'asc' }
    const configDesc: HtopConfig = { ...DEFAULT_CONFIG, treeSortDirection: 'desc' }

    expect(serializeHtoprc(configAsc)).toContain('tree_sort_direction=1')
    expect(serializeHtoprc(configDesc)).toContain('tree_sort_direction=-1')
  })

  it('serializes numeric options', () => {
    const config: HtopConfig = {
      ...DEFAULT_CONFIG,
      colorScheme: 6,
      delay: 20,
      hideFunctionBar: 2,
      sortKey: 48,
      treeSortKey: 10,
      highlightChangesDelaySecs: 10,
    }
    const output = serializeHtoprc(config)

    expect(output).toContain('color_scheme=6')
    expect(output).toContain('delay=20')
    expect(output).toContain('hide_function_bar=2')
    expect(output).toContain('sort_key=48')
    expect(output).toContain('tree_sort_key=10')
    expect(output).toContain('highlight_changes_delay_secs=10')
  })

  it('serializes header_layout', () => {
    const config: HtopConfig = { ...DEFAULT_CONFIG, headerLayout: 'four_25_25_25_25' }
    const output = serializeHtoprc(config)
    expect(output).toContain('header_layout=four_25_25_25_25')
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

  it('serializes screen with asc sort direction', () => {
    const config: HtopConfig = {
      ...DEFAULT_CONFIG,
      screens: [
        {
          name: 'Test',
          columns: ['PID'],
          sortDirection: 'asc',
        },
      ],
    }
    const output = serializeHtoprc(config)
    expect(output).toContain('.sort_direction=1')
  })

  it('serializes screen with tree_view=true', () => {
    const config: HtopConfig = {
      ...DEFAULT_CONFIG,
      screens: [
        {
          name: 'Tree',
          columns: ['PID', 'Command'],
          treeView: true,
        },
      ],
    }
    const output = serializeHtoprc(config)
    expect(output).toContain('.tree_view=1')
  })

  it('does not serialize empty screens array', () => {
    const config: HtopConfig = { ...DEFAULT_CONFIG, screens: [] }
    const output = serializeHtoprc(config)
    expect(output).not.toContain('screen:')
  })

  it('only serializes defined screen options', () => {
    const config: HtopConfig = {
      ...DEFAULT_CONFIG,
      screens: [
        {
          name: 'Minimal',
          columns: ['PID'],
          // No sortKey, sortDirection, or treeView defined
        },
      ],
    }
    const output = serializeHtoprc(config)
    expect(output).toContain('screen:Minimal=PID')
    expect(output).not.toContain('.sort_key=')
    expect(output).not.toContain('.sort_direction=')
    expect(output).not.toContain('.tree_view=')
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

  it('respects includeVersion option (default true)', () => {
    const config: HtopConfig = {
      ...DEFAULT_CONFIG,
      htopVersion: '3.2.1',
    }
    const outputWithVersion = serializeHtoprc(config)
    const outputWithoutVersion = serializeHtoprc(config, { includeVersion: false })

    expect(outputWithVersion).toContain('htop_version=3.2.1')
    expect(outputWithoutVersion).not.toContain('htop_version=')
  })

  it('includes configReaderMinVersion when set', () => {
    const config: HtopConfig = {
      ...DEFAULT_CONFIG,
      configReaderMinVersion: 3,
    }
    const output = serializeHtoprc(config)
    expect(output).toContain('config_reader_min_version=3')
  })

  it('does not include version if not set', () => {
    const output = serializeHtoprc(DEFAULT_CONFIG)
    expect(output).not.toContain('htop_version=')
    expect(output).not.toContain('config_reader_min_version=')
  })

  it('does not include fields if columns array is empty', () => {
    const config: HtopConfig = { ...DEFAULT_CONFIG, columns: [] }
    const output = serializeHtoprc(config)
    expect(output).not.toContain('fields=')
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

    it('round-trips screen definitions correctly', () => {
      const input = `htop_version=3.3.0
config_reader_min_version=3
screen:Main=PID USER PERCENT_CPU PERCENT_MEM Command
.sort_key=PERCENT_CPU
.sort_direction=-1
.tree_view=0
screen:I/O=PID USER IO_RATE Command
.sort_key=IO_RATE
.sort_direction=-1`

      const parsed1 = parseHtoprc(input)
      const serialized = serializeHtoprc(parsed1.config)
      const parsed2 = parseHtoprc(serialized)

      expect(parsed2.config.screens).toHaveLength(2)
      expect(parsed2.config.screens[0]?.name).toBe('Main')
      expect(parsed2.config.screens[0]?.sortKey).toBe('PERCENT_CPU')
      expect(parsed2.config.screens[0]?.sortDirection).toBe('desc')
      expect(parsed2.config.screens[0]?.treeView).toBe(false)
      expect(parsed2.config.screens[1]?.name).toBe('I/O')
    })

    it('round-trips unknown options correctly', () => {
      const input = `color_scheme=0
future_option=future_value
another_new_option=123`

      const parsed1 = parseHtoprc(input)
      const serialized = serializeHtoprc(parsed1.config)
      const parsed2 = parseHtoprc(serialized)

      expect(parsed2.config.unknownOptions).toEqual(parsed1.config.unknownOptions)
    })

    it('round-trips all meter modes correctly', () => {
      const input = `column_meters_0=CPU Memory Swap Tasks
column_meter_modes_0=1 2 3 4
column_meters_1=LoadAverage Uptime
column_meter_modes_1=2 2`

      const parsed1 = parseHtoprc(input)
      const serialized = serializeHtoprc(parsed1.config)
      const parsed2 = parseHtoprc(serialized)

      expect(parsed2.config.leftMeters).toEqual(parsed1.config.leftMeters)
      expect(parsed2.config.rightMeters).toEqual(parsed1.config.rightMeters)
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

  describe('default options behavior', () => {
    it('serializes all options when onlyNonDefaults is false (default)', () => {
      const config: HtopConfig = { ...DEFAULT_CONFIG }
      const output = serializeHtoprc(config)

      // Should contain default values
      expect(output).toContain('color_scheme=0')
      expect(output).toContain('tree_view=0')
      expect(output).toContain('delay=15')
      expect(output).toContain('enable_mouse=1')
    })

    it('serializes minimal output when onlyNonDefaults is true with default config', () => {
      const output = serializeHtoprc(DEFAULT_CONFIG, { onlyNonDefaults: true })

      // Should not contain any lines since all values are defaults
      // Note: columns may be empty array which equals default
      expect(output).not.toContain('color_scheme=')
      expect(output).not.toContain('tree_view=')
    })
  })
})
