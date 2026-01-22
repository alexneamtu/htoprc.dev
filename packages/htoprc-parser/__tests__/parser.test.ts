import { describe, it, expect } from 'vitest'
import { parseHtoprc, DEFAULT_CONFIG } from '../src/parser'

describe('parseHtoprc', () => {
  describe('basic parsing', () => {
    it('parses an empty string and returns default config', () => {
      const result = parseHtoprc('')

      expect(result.config).toBeDefined()
      expect(result.warnings).toEqual([])
      expect(result.errors).toEqual([])
      expect(result.version).toBe('unknown')
      expect(result.score).toBe(0)
    })

    it('returns a new config object, not the default reference', () => {
      const result1 = parseHtoprc('')
      const result2 = parseHtoprc('')

      expect(result1.config).not.toBe(result2.config)
      expect(result1.config).not.toBe(DEFAULT_CONFIG)
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

    it('handles whitespace around key=value', () => {
      const input = `  color_scheme=2
  tree_view=1  `

      const result = parseHtoprc(input)

      expect(result.config.colorScheme).toBe(2)
      expect(result.config.treeView).toBe(true)
    })

    it('parses all boolean options correctly', () => {
      const input = `hide_kernel_threads=1
hide_userland_threads=1
hide_running_in_container=1
shadow_other_users=1
show_thread_names=1
show_program_path=0
highlight_base_name=1
highlight_deleted_exe=0
shadow_distribution_path_prefix=1
highlight_megabytes=0
highlight_threads=0
highlight_changes=1
find_comm_in_cmdline=0
strip_exe_from_cmdline=0
show_merged_command=1
header_margin=0
screen_tabs=0
detailed_cpu_time=1
cpu_count_from_one=1
show_cpu_usage=0
show_cpu_frequency=1
show_cpu_temperature=1
show_cached_memory=1
degree_fahrenheit=1
update_process_names=1
account_guest_in_cpu_meter=1
topology_affinity=1
enable_mouse=0
tree_view=1
tree_view_always_by_pid=1
all_branches_collapsed=1`

      const result = parseHtoprc(input)

      expect(result.config.hideKernelThreads).toBe(true)
      expect(result.config.hideUserlandThreads).toBe(true)
      expect(result.config.shadowOtherUsers).toBe(true)
      expect(result.config.showThreadNames).toBe(true)
      expect(result.config.showProgramPath).toBe(false)
      expect(result.config.highlightBaseName).toBe(true)
      expect(result.config.highlightDeletedExe).toBe(false)
      expect(result.config.highlightMegabytes).toBe(false)
      expect(result.config.highlightThreads).toBe(false)
      expect(result.config.highlightChanges).toBe(true)
      expect(result.config.findCommInCmdline).toBe(false)
      expect(result.config.stripExeFromCmdline).toBe(false)
      expect(result.config.showMergedCommand).toBe(true)
      expect(result.config.headerMargin).toBe(false)
      expect(result.config.screenTabs).toBe(false)
      expect(result.config.detailedCpuTime).toBe(true)
      expect(result.config.cpuCountFromOne).toBe(true)
      expect(result.config.showCpuUsage).toBe(false)
      expect(result.config.showCpuFrequency).toBe(true)
      expect(result.config.showCpuTemperature).toBe(true)
      expect(result.config.degreeFahrenheit).toBe(true)
      expect(result.config.updateProcessNames).toBe(true)
      expect(result.config.accountGuestInCpuMeter).toBe(true)
      expect(result.config.enableMouse).toBe(false)
      expect(result.config.treeView).toBe(true)
      expect(result.config.treeViewAlwaysByPid).toBe(true)
      expect(result.config.allBranchesCollapsed).toBe(true)
    })

    it('parses all numeric options correctly', () => {
      const input = `color_scheme=6
delay=20
hide_function_bar=2
sort_key=48
tree_sort_key=10
highlight_changes_delay_secs=10`

      const result = parseHtoprc(input)

      expect(result.config.colorScheme).toBe(6)
      expect(result.config.delay).toBe(20)
      expect(result.config.hideFunctionBar).toBe(2)
      expect(result.config.sortKey).toBe(48)
      expect(result.config.treeSortKey).toBe(10)
      expect(result.config.highlightChangesDelaySecs).toBe(10)
    })

    it('parses sort directions correctly', () => {
      const inputAsc = `sort_direction=1
tree_sort_direction=1`
      const inputDesc = `sort_direction=-1
tree_sort_direction=-1`

      const resultAsc = parseHtoprc(inputAsc)
      const resultDesc = parseHtoprc(inputDesc)

      expect(resultAsc.config.sortDirection).toBe('asc')
      expect(resultAsc.config.treeSortDirection).toBe('asc')
      expect(resultDesc.config.sortDirection).toBe('desc')
      expect(resultDesc.config.treeSortDirection).toBe('desc')
    })

    it('parses header_layout option', () => {
      const input = 'header_layout=four_25_25_25_25'

      const result = parseHtoprc(input)

      expect(result.config.headerLayout).toBe('four_25_25_25_25')
    })

    it('parses htop_version option', () => {
      const input = 'htop_version=3.3.0'

      const result = parseHtoprc(input)

      expect(result.config.htopVersion).toBe('3.3.0')
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

    it('ignores inline comments are not supported (htoprc format)', () => {
      // Note: htoprc doesn't support inline comments, so # after a value is part of the value
      const input = 'header_layout=two_50_50 # comment'

      const result = parseHtoprc(input)

      // The value includes the comment part
      expect(result.config.headerLayout).toBe('two_50_50 # comment')
    })

    it('ignores empty lines', () => {
      const input = `color_scheme=1

tree_view=1

`

      const result = parseHtoprc(input)

      expect(result.config.colorScheme).toBe(1)
      expect(result.config.treeView).toBe(true)
    })

    it('ignores lines without equals sign', () => {
      const input = `color_scheme=2
invalid_line_without_equals
tree_view=1`

      const result = parseHtoprc(input)

      expect(result.config.colorScheme).toBe(2)
      expect(result.config.treeView).toBe(true)
      expect(result.warnings).toEqual([])
    })

    it('handles file with only comments', () => {
      const input = `# Comment 1
# Comment 2
# Comment 3`

      const result = parseHtoprc(input)

      expect(result.config).toBeDefined()
      expect(result.warnings).toEqual([])
    })

    it('handles file with only empty lines', () => {
      const input = `


`

      const result = parseHtoprc(input)

      expect(result.config).toBeDefined()
      expect(result.warnings).toEqual([])
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

    it('preserves multiple unknown options', () => {
      const input = `future_option_1=value1
future_option_2=value2
future_option_3=123`

      const result = parseHtoprc(input)

      expect(result.warnings).toHaveLength(3)
      expect(result.config.unknownOptions).toEqual({
        future_option_1: 'value1',
        future_option_2: 'value2',
        future_option_3: '123',
      })
    })

    it('includes line number in warning', () => {
      const input = `color_scheme=1
unknown_first=a
color_scheme=2
unknown_second=b`

      const result = parseHtoprc(input)

      expect(result.warnings).toHaveLength(2)
      expect(result.warnings[0]?.line).toBe(2)
      expect(result.warnings[1]?.line).toBe(4)
    })

    it('recognizes v2 format options as known (left_meters)', () => {
      const input = `left_meters=CPU Memory Swap
left_meter_modes=1 1 1`

      const result = parseHtoprc(input)

      // These should be recognized as known options (v2 format)
      const leftMetersWarnings = result.warnings.filter(
        (w) => w.message.includes('left_meters') || w.message.includes('left_meter_modes')
      )
      expect(leftMetersWarnings).toHaveLength(0)
    })

    it('recognizes v2 format options as known (right_meters)', () => {
      const input = `right_meters=Tasks LoadAverage
right_meter_modes=2 2`

      const result = parseHtoprc(input)

      const rightMetersWarnings = result.warnings.filter(
        (w) => w.message.includes('right_meters') || w.message.includes('right_meter_modes')
      )
      expect(rightMetersWarnings).toHaveLength(0)
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

    it('parses graph mode (3)', () => {
      const input = `column_meters_0=CPU
column_meter_modes_0=3`

      const result = parseHtoprc(input)

      expect(result.config.leftMeters).toEqual([{ type: 'CPU', mode: 'graph' }])
    })

    it('parses led mode (4)', () => {
      const input = `column_meters_0=Memory
column_meter_modes_0=4`

      const result = parseHtoprc(input)

      expect(result.config.leftMeters).toEqual([{ type: 'Memory', mode: 'led' }])
    })

    it('falls back to bar mode for invalid mode numbers', () => {
      const input = `column_meters_0=CPU
column_meter_modes_0=99`

      const result = parseHtoprc(input)

      expect(result.config.leftMeters).toEqual([{ type: 'CPU', mode: 'bar' }])
    })

    it('falls back to bar mode for mode 0', () => {
      const input = `column_meters_0=CPU
column_meter_modes_0=0`

      const result = parseHtoprc(input)

      expect(result.config.leftMeters).toEqual([{ type: 'CPU', mode: 'bar' }])
    })

    it('handles meters without corresponding modes', () => {
      const input = `column_meters_0=CPU Memory Swap`

      const result = parseHtoprc(input)

      // All meters should default to bar mode
      expect(result.config.leftMeters).toEqual([
        { type: 'CPU', mode: 'bar' },
        { type: 'Memory', mode: 'bar' },
        { type: 'Swap', mode: 'bar' },
      ])
    })

    it('handles more modes than meters gracefully', () => {
      const input = `column_meters_0=CPU
column_meter_modes_0=1 2 3 4`

      const result = parseHtoprc(input)

      // Should only use modes for existing meters
      expect(result.config.leftMeters).toHaveLength(1)
      expect(result.config.leftMeters[0]).toEqual({ type: 'CPU', mode: 'bar' })
    })

    it('handles empty meter list', () => {
      const input = `column_meters_0=
column_meter_modes_0=`

      const result = parseHtoprc(input)

      expect(result.config.leftMeters).toEqual([])
    })

    it('parses higher column indices (column 2+)', () => {
      const input = `column_meters_0=CPU
column_meter_modes_0=1
column_meters_1=Memory
column_meter_modes_1=2
column_meters_2=Swap
column_meter_modes_2=3`

      const result = parseHtoprc(input)

      expect(result.config.leftMeters).toEqual([{ type: 'CPU', mode: 'bar' }])
      expect(result.config.rightMeters).toEqual([{ type: 'Memory', mode: 'text' }])
      // Note: columns beyond 0 and 1 are parsed but only 0 and 1 are mapped to leftMeters/rightMeters
    })

    it('parses mixed meter modes correctly', () => {
      const input = `column_meters_0=CPU Memory Swap Tasks
column_meter_modes_0=1 2 3 4`

      const result = parseHtoprc(input)

      expect(result.config.leftMeters).toEqual([
        { type: 'CPU', mode: 'bar' },
        { type: 'Memory', mode: 'text' },
        { type: 'Swap', mode: 'graph' },
        { type: 'Tasks', mode: 'led' },
      ])
    })
  })

  describe('fields (columns) parsing', () => {
    it('parses process list fields', () => {
      const input = 'fields=0 48 17 18 38 39 40 2 46 47 49 1'

      const result = parseHtoprc(input)

      expect(result.config.columns).toEqual([0, 48, 17, 18, 38, 39, 40, 2, 46, 47, 49, 1])
    })

    it('parses single field', () => {
      const input = 'fields=1'

      const result = parseHtoprc(input)

      expect(result.config.columns).toEqual([1])
    })

    it('parses many fields (high column count)', () => {
      const input = 'fields=0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15'

      const result = parseHtoprc(input)

      expect(result.config.columns).toHaveLength(16)
      expect(result.config.columns).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    })

    it('handles empty fields', () => {
      const input = 'fields='

      const result = parseHtoprc(input)

      // Empty string split results in [NaN], which maps to [0] after parseInt
      expect(result.config.columns).toHaveLength(1)
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

      expect(result.score).toBe(10)
    })

    it('does not add score for color_scheme=0 (default)', () => {
      const input = 'color_scheme=0'

      const result = parseHtoprc(input)

      expect(result.score).toBe(0)
    })

    it('scores tree view +5', () => {
      const input = 'tree_view=1'

      const result = parseHtoprc(input)

      expect(result.score).toBe(5)
    })

    it('does not add score for tree_view=0', () => {
      const input = 'tree_view=0'

      const result = parseHtoprc(input)

      expect(result.score).toBe(0)
    })

    it('scores left meters +5', () => {
      const input = `column_meters_0=CPU Memory`

      const result = parseHtoprc(input)

      expect(result.score).toBe(5)
    })

    it('scores right meters +5', () => {
      const input = `column_meters_1=Tasks LoadAverage`

      const result = parseHtoprc(input)

      expect(result.score).toBe(5)
    })

    it('scores both left and right meters +10 total', () => {
      const input = `column_meters_0=CPU Memory
column_meters_1=Tasks LoadAverage`

      const result = parseHtoprc(input)

      expect(result.score).toBe(10)
    })

    it('scores custom header layout +3', () => {
      const input = 'header_layout=four_25_25_25_25'

      const result = parseHtoprc(input)

      expect(result.score).toBe(3)
    })

    it('does not add score for default header layout', () => {
      const input = 'header_layout=two_50_50'

      const result = parseHtoprc(input)

      expect(result.score).toBe(0)
    })

    it('scores many columns bonus +3 when > 8 columns', () => {
      const input = 'fields=0 1 2 3 4 5 6 7 8 9'

      const result = parseHtoprc(input)

      expect(result.score).toBe(3)
    })

    it('does not add many columns bonus when <= 8 columns', () => {
      const input = 'fields=0 1 2 3 4 5 6 7'

      const result = parseHtoprc(input)

      expect(result.score).toBe(0)
    })

    it('accumulates multiple scores correctly', () => {
      const input = `color_scheme=5
tree_view=1
column_meters_0=CPU Memory
column_meters_1=Tasks LoadAverage
header_layout=four_25_25_25_25
fields=0 1 2 3 4 5 6 7 8 9`

      const result = parseHtoprc(input)

      // 10 (color) + 5 (tree) + 5 (left) + 5 (right) + 3 (layout) + 3 (columns) = 31
      expect(result.score).toBe(31)
    })
  })

  describe('version detection', () => {
    it('detects htop 3.x format', () => {
      const input = `htop_version=3.2.1
config_reader_min_version=3`

      const result = parseHtoprc(input)

      expect(result.version).toBe('v3')
      expect(result.config.htopVersion).toBe('3.2.1')
      expect(result.config.configReaderMinVersion).toBe(3)
    })

    it('detects htop 2.x format', () => {
      const input = `htop_version=2.2.0
config_reader_min_version=2`

      const result = parseHtoprc(input)

      expect(result.version).toBe('v2')
    })

    it('detects v3 for config_reader_min_version >= 3', () => {
      const input = 'config_reader_min_version=4'

      const result = parseHtoprc(input)

      expect(result.version).toBe('v3')
    })

    it('returns unknown for configs without version', () => {
      const input = 'color_scheme=1'

      const result = parseHtoprc(input)

      expect(result.version).toBe('unknown')
    })

    it('returns unknown for config_reader_min_version=1', () => {
      const input = 'config_reader_min_version=1'

      const result = parseHtoprc(input)

      expect(result.version).toBe('unknown')
    })

    it('parses htop_version without config_reader_min_version', () => {
      const input = 'htop_version=3.0.0'

      const result = parseHtoprc(input)

      expect(result.config.htopVersion).toBe('3.0.0')
      expect(result.version).toBe('unknown')
    })
  })

  describe('screen definitions (htop 3.x)', () => {
    it('parses screen definitions', () => {
      const input = `screen:Main=PID USER PERCENT_CPU PERCENT_MEM Command`

      const result = parseHtoprc(input)

      expect(result.config.screens).toHaveLength(1)
      expect(result.config.screens[0].name).toBe('Main')
      expect(result.config.screens[0].columns).toEqual(['PID', 'USER', 'PERCENT_CPU', 'PERCENT_MEM', 'Command'])
    })

    it('parses multiple screen definitions', () => {
      const input = `screen:Main=PID USER Command
screen:I/O=PID USER IO_RATE COMM`

      const result = parseHtoprc(input)

      expect(result.config.screens).toHaveLength(2)
      expect(result.config.screens[0].name).toBe('Main')
      expect(result.config.screens[1].name).toBe('I/O')
    })

    it('parses screen-specific options', () => {
      const input = `screen:Main=PID USER Command
.sort_key=PERCENT_CPU
.sort_direction=-1
.tree_view=0`

      const result = parseHtoprc(input)

      expect(result.config.screens[0].sortKey).toBe('PERCENT_CPU')
      expect(result.config.screens[0].sortDirection).toBe('desc')
      expect(result.config.screens[0].treeView).toBe(false)
    })

    it('associates options with correct screen', () => {
      const input = `screen:Main=PID USER Command
.sort_key=PERCENT_CPU
screen:I/O=PID USER IO_RATE
.sort_key=IO_RATE
.tree_view=1`

      const result = parseHtoprc(input)

      expect(result.config.screens[0].sortKey).toBe('PERCENT_CPU')
      expect(result.config.screens[0].treeView).toBeUndefined()
      expect(result.config.screens[1].sortKey).toBe('IO_RATE')
      expect(result.config.screens[1].treeView).toBe(true)
    })

    it('returns empty screens array when none defined', () => {
      const input = `color_scheme=1`

      const result = parseHtoprc(input)

      expect(result.config.screens).toEqual([])
    })

    it('parses screen with empty columns', () => {
      const input = 'screen:Empty='

      const result = parseHtoprc(input)

      expect(result.config.screens).toHaveLength(1)
      expect(result.config.screens[0]?.name).toBe('Empty')
      expect(result.config.screens[0]?.columns).toEqual([])
    })

    it('ignores dot-prefixed options before any screen is defined', () => {
      const input = `.sort_key=PERCENT_CPU
screen:Main=PID USER Command`

      const result = parseHtoprc(input)

      // The orphan dot-prefixed option should be ignored
      expect(result.config.screens).toHaveLength(1)
      expect(result.config.screens[0]?.sortKey).toBeUndefined()
    })

    it('parses sort_direction=1 as asc for screens', () => {
      const input = `screen:Main=PID USER Command
.sort_direction=1`

      const result = parseHtoprc(input)

      expect(result.config.screens[0]?.sortDirection).toBe('asc')
    })

    it('parses tree_view=1 as true for screens', () => {
      const input = `screen:Main=PID USER Command
.tree_view=1`

      const result = parseHtoprc(input)

      expect(result.config.screens[0]?.treeView).toBe(true)
    })
  })

  describe('DEFAULT_CONFIG', () => {
    it('has expected default values', () => {
      expect(DEFAULT_CONFIG.colorScheme).toBe(0)
      expect(DEFAULT_CONFIG.headerLayout).toBe('two_50_50')
      expect(DEFAULT_CONFIG.showProgramPath).toBe(true)
      expect(DEFAULT_CONFIG.highlightBaseName).toBe(false)
      expect(DEFAULT_CONFIG.treeView).toBe(false)
      expect(DEFAULT_CONFIG.delay).toBe(15)
      expect(DEFAULT_CONFIG.enableMouse).toBe(true)
      expect(DEFAULT_CONFIG.hideKernelThreads).toBe(true)
      expect(DEFAULT_CONFIG.sortKey).toBe(46)
      expect(DEFAULT_CONFIG.sortDirection).toBe('desc')
      expect(DEFAULT_CONFIG.leftMeters).toEqual([])
      expect(DEFAULT_CONFIG.rightMeters).toEqual([])
      expect(DEFAULT_CONFIG.columns).toEqual([])
      expect(DEFAULT_CONFIG.screens).toEqual([])
      expect(DEFAULT_CONFIG.unknownOptions).toEqual({})
    })
  })

  describe('edge cases', () => {
    it('handles key with multiple equals signs', () => {
      const input = 'some_option=value=with=equals'

      const result = parseHtoprc(input)

      expect(result.config.unknownOptions.some_option).toBe('value=with=equals')
    })

    it('handles very long lines', () => {
      const longValue = 'a'.repeat(1000)
      const input = `header_layout=${longValue}`

      const result = parseHtoprc(input)

      expect(result.config.headerLayout).toBe(longValue)
    })

    it('handles unicode in values', () => {
      const input = 'unknown_option=value_with_unicode_\u00e9\u00e0\u00fc'

      const result = parseHtoprc(input)

      expect(result.config.unknownOptions.unknown_option).toBe('value_with_unicode_\u00e9\u00e0\u00fc')
    })

    it('processes lines in order (later values override earlier)', () => {
      const input = `color_scheme=1
color_scheme=5`

      const result = parseHtoprc(input)

      expect(result.config.colorScheme).toBe(5)
    })

    it('handles Windows-style line endings (CRLF)', () => {
      const input = 'color_scheme=3\r\ntree_view=1\r\n'

      const result = parseHtoprc(input)

      // Note: The parser uses trim() which should handle \r
      expect(result.config.colorScheme).toBe(3)
      expect(result.config.treeView).toBe(true)
    })
  })
})
