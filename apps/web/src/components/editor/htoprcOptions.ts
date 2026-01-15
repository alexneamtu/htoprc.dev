/**
 * Htoprc option definitions for autocomplete and documentation
 */

export interface HtoprcOption {
  name: string
  description: string
  type: 'string' | 'number' | 'boolean' | 'list' | 'enum'
  values?: string[]
  example?: string
}

export const HTOPRC_OPTIONS: HtoprcOption[] = [
  // Version options
  {
    name: 'htop_version',
    description: 'The htop version that created this config file',
    type: 'string',
    example: '3.2.1',
  },
  {
    name: 'config_reader_min_version',
    description: 'Minimum htop version required to read this config',
    type: 'number',
    example: '3',
  },

  // Display options
  {
    name: 'color_scheme',
    description: 'Color scheme (0-6): 0=default, 1=monochrome, 2=black on white, 3=light terminal, 4=MC, 5=black night, 6=broken gray',
    type: 'number',
    values: ['0', '1', '2', '3', '4', '5', '6'],
  },
  {
    name: 'header_layout',
    description: 'Layout of header columns',
    type: 'enum',
    values: ['two_50_50', 'two_33_67', 'two_67_33', 'three_33_34_33', 'three_25_25_50', 'three_25_50_25', 'three_50_25_25', 'four_25_25_25_25'],
  },
  {
    name: 'show_program_path',
    description: 'Show full path in Command column',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'highlight_base_name',
    description: 'Highlight program basename in Command',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'highlight_deleted_exe',
    description: 'Highlight deleted/replaced executables',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'highlight_megabytes',
    description: 'Highlight large memory values',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'highlight_threads',
    description: 'Highlight threads in a different color',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'highlight_changes',
    description: 'Highlight changed values',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'highlight_changes_delay_secs',
    description: 'Seconds to highlight changed values',
    type: 'number',
    example: '5',
  },
  {
    name: 'shadow_other_users',
    description: 'Shadow other users\' processes',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'show_thread_names',
    description: 'Show thread names in Command column',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'show_cpu_usage',
    description: 'Show CPU usage percentage',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'show_cpu_frequency',
    description: 'Show CPU frequency in meters',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'show_cpu_temperature',
    description: 'Show CPU temperature in meters',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'degree_fahrenheit',
    description: 'Show temperature in Fahrenheit (0=Celsius)',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'update_process_names',
    description: 'Update process names on refresh',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'account_guest_in_cpu_meter',
    description: 'Account guest time in CPU meter',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'enable_mouse',
    description: 'Enable mouse support',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'delay',
    description: 'Update delay in tenths of seconds (default 15 = 1.5s)',
    type: 'number',
    example: '15',
  },
  {
    name: 'hide_function_bar',
    description: 'Hide the function key bar at bottom (0=show, 1=hide, 2=auto)',
    type: 'number',
    values: ['0', '1', '2'],
  },
  {
    name: 'header_margin',
    description: 'Show margin between header columns',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'screen_tabs',
    description: 'Show screen tabs',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'detailed_cpu_time',
    description: 'Show detailed CPU time breakdown',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'cpu_count_from_one',
    description: 'Number CPUs from 1 instead of 0',
    type: 'boolean',
    values: ['0', '1'],
  },

  // Header meters
  {
    name: 'column_meters_0',
    description: 'Meters in left header column (space-separated)',
    type: 'list',
    example: 'AllCPUs Memory Swap',
  },
  {
    name: 'column_meter_modes_0',
    description: 'Display modes for left column meters (1=bar, 2=text, 3=graph, 4=led)',
    type: 'list',
    example: '1 1 1',
  },
  {
    name: 'column_meters_1',
    description: 'Meters in right header column (space-separated)',
    type: 'list',
    example: 'Tasks LoadAverage Uptime',
  },
  {
    name: 'column_meter_modes_1',
    description: 'Display modes for right column meters',
    type: 'list',
    example: '2 2 2',
  },
  {
    name: 'column_meters_2',
    description: 'Meters in third header column (if using 3+ column layout)',
    type: 'list',
  },
  {
    name: 'column_meter_modes_2',
    description: 'Display modes for third column meters',
    type: 'list',
  },
  {
    name: 'column_meters_3',
    description: 'Meters in fourth header column (if using 4 column layout)',
    type: 'list',
  },
  {
    name: 'column_meter_modes_3',
    description: 'Display modes for fourth column meters',
    type: 'list',
  },

  // Process list
  {
    name: 'fields',
    description: 'Column fields to display (space-separated field IDs)',
    type: 'list',
    example: '0 48 17 18 38 39 40 2 46 47 49 1',
  },
  {
    name: 'sort_key',
    description: 'Field ID to sort by',
    type: 'number',
    example: '46',
  },
  {
    name: 'sort_direction',
    description: 'Sort direction (1=descending, -1=ascending)',
    type: 'number',
    values: ['-1', '1'],
  },
  {
    name: 'tree_view',
    description: 'Enable tree view mode',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'tree_sort_key',
    description: 'Field ID for tree view sorting',
    type: 'number',
  },
  {
    name: 'tree_sort_direction',
    description: 'Tree view sort direction',
    type: 'number',
    values: ['-1', '1'],
  },
  {
    name: 'tree_view_always_by_pid',
    description: 'Always sort tree view by PID',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'all_branches_collapsed',
    description: 'Start with all tree branches collapsed',
    type: 'boolean',
    values: ['0', '1'],
  },

  // Threading
  {
    name: 'hide_kernel_threads',
    description: 'Hide kernel threads from process list',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'hide_userland_threads',
    description: 'Hide userland threads from process list',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'hide_running_in_container',
    description: 'Hide processes running in containers',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'shadow_distribution_path_prefix',
    description: 'Shadow distribution path prefix in command display',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'show_cached_memory',
    description: 'Show cached memory in memory meter',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'topology_affinity',
    description: 'Show CPU topology affinity',
    type: 'boolean',
    values: ['0', '1'],
  },

  // Command display
  {
    name: 'find_comm_in_cmdline',
    description: 'Show command name from cmdline if not found elsewhere',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'strip_exe_from_cmdline',
    description: 'Strip executable path from command line',
    type: 'boolean',
    values: ['0', '1'],
  },
  {
    name: 'show_merged_command',
    description: 'Show merged command and arguments',
    type: 'boolean',
    values: ['0', '1'],
  },
]

export const METER_TYPES = [
  // CPU meters
  'CPU',
  'AllCPUs',
  'AllCPUs2',
  'AllCPUs4',
  'AllCPUs8',
  'LeftCPUs',
  'LeftCPUs2',
  'LeftCPUs4',
  'LeftCPUs8',
  'RightCPUs',
  'RightCPUs2',
  'RightCPUs4',
  'RightCPUs8',
  'CPUFrequency',
  'CPUTemperature',
  // Memory meters
  'Memory',
  'Swap',
  'Zram',
  'ZFSARC',
  'ZFSCARC',
  // System info meters
  'Tasks',
  'LoadAverage',
  'Uptime',
  'Clock',
  'Date',
  'DateTime',
  'Hostname',
  'SysArch',
  'Battery',
  // I/O meters
  'DiskIO',
  'NetworkIO',
  'FileDescriptors',
  // Pressure meters
  'Pressure',
  'PressureStallCPUSome',
  'PressureStallIOSome',
  'PressureStallMemorySome',
  'PressureStallCPUFull',
  'PressureStallIOFull',
  'PressureStallMemoryFull',
  // Security/System meters
  'SELinux',
  'Systemd',
  'GPU',
  // Utility
  'Blank',
]

export const OPTION_MAP = new Map(HTOPRC_OPTIONS.map((opt) => [opt.name, opt]))
