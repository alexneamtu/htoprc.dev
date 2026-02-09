import type { HtopConfig, Meter, MeterMode, ScreenDefinition } from './types'
import { DEFAULT_CONFIG } from './parser'

/**
 * Convert MeterMode to number for htoprc format
 */
function meterModeToNumber(mode: MeterMode): number {
  switch (mode) {
    case 'bar':
      return 1
    case 'text':
      return 2
    case 'graph':
      return 3
    case 'led':
      return 4
    default:
      return 1
  }
}

/**
 * Convert boolean to htoprc format (1 or 0)
 */
function boolToString(value: boolean): string {
  return value ? '1' : '0'
}

/**
 * Convert sort direction to htoprc format
 */
function sortDirectionToString(direction: 'asc' | 'desc'): string {
  return direction === 'asc' ? '1' : '-1'
}

/**
 * Serialize meters to htoprc format
 */
function serializeMeters(meters: Meter[]): { names: string; modes: string } {
  const names = meters.map((m) => m.type).join(' ')
  const modes = meters.map((m) => meterModeToNumber(m.mode)).join(' ')
  return { names, modes }
}

/**
 * Serialize screen definitions to htoprc format
 */
function serializeScreens(screens: ScreenDefinition[]): string[] {
  const lines: string[] = []

  for (const screen of screens) {
    lines.push(`screen:${screen.name}=${screen.columns.join(' ')}`)

    if (screen.sortKey !== undefined) {
      lines.push(`.sort_key=${screen.sortKey}`)
    }
    if (screen.sortDirection !== undefined) {
      lines.push(`.sort_direction=${screen.sortDirection === 'asc' ? '1' : '-1'}`)
    }
    if (screen.treeView !== undefined) {
      lines.push(`.tree_view=${boolToString(screen.treeView)}`)
    }
  }

  return lines
}

/**
 * Options to control serialization behavior
 */
export interface SerializeOptions {
  /** Include htop_version if present (default: true) */
  includeVersion?: boolean
  /** Only include options that differ from defaults (default: false) */
  onlyNonDefaults?: boolean
  /** Include unknown options (default: true) */
  includeUnknown?: boolean
}

/**
 * Serialize an HtopConfig back to htoprc format
 */
export function serializeHtoprc(config: HtopConfig, options: SerializeOptions = {}): string {
  const { includeVersion = true, onlyNonDefaults = false, includeUnknown = true } = options

  const lines: string[] = []

  // Helper to add option if it differs from default (or always if onlyNonDefaults is false)
  const addOption = <K extends keyof HtopConfig>(
    key: string,
    configKey: K,
    formatter: (value: HtopConfig[K]) => string = String
  ) => {
    const value = config[configKey]
    const defaultValue = DEFAULT_CONFIG[configKey]

    if (!onlyNonDefaults || value !== defaultValue) {
      lines.push(`${key}=${formatter(value)}`)
    }
  }

  // Helper for boolean options
  const addBoolOption = (key: string, configKey: keyof HtopConfig) => {
    addOption(key, configKey, (v) => boolToString(v as boolean))
  }

  // Version info
  if (includeVersion && config.htopVersion) {
    lines.push(`htop_version=${config.htopVersion}`)
  }
  if (config.configReaderMinVersion !== undefined) {
    lines.push(`config_reader_min_version=${config.configReaderMinVersion}`)
  }

  // Process list columns
  if (config.columns.length > 0) {
    lines.push(`fields=${config.columns.join(' ')}`)
  }

  // Sort options
  addOption('sort_key', 'sortKey')
  addOption('sort_direction', 'sortDirection', sortDirectionToString)
  addOption('tree_sort_key', 'treeSortKey')
  addOption('tree_sort_direction', 'treeSortDirection', sortDirectionToString)

  // Threading options
  addBoolOption('hide_kernel_threads', 'hideKernelThreads')
  addBoolOption('hide_userland_threads', 'hideUserlandThreads')

  // Display options
  addBoolOption('shadow_other_users', 'shadowOtherUsers')
  addBoolOption('show_thread_names', 'showThreadNames')
  addBoolOption('show_program_path', 'showProgramPath')
  addBoolOption('highlight_base_name', 'highlightBaseName')
  addBoolOption('highlight_deleted_exe', 'highlightDeletedExe')
  addBoolOption('highlight_megabytes', 'highlightMegabytes')
  addBoolOption('highlight_threads', 'highlightThreads')
  addBoolOption('highlight_changes', 'highlightChanges')
  addOption('highlight_changes_delay_secs', 'highlightChangesDelaySecs')

  // Color and layout
  addOption('color_scheme', 'colorScheme')
  addBoolOption('enable_mouse', 'enableMouse')
  addOption('delay', 'delay')
  addOption('header_layout', 'headerLayout')

  // Tree view
  addBoolOption('tree_view', 'treeView')
  addBoolOption('tree_view_always_by_pid', 'treeViewAlwaysByPid')
  addBoolOption('all_branches_collapsed', 'allBranchesCollapsed')

  // Command display
  addBoolOption('find_comm_in_cmdline', 'findCommInCmdline')
  addBoolOption('strip_exe_from_cmdline', 'stripExeFromCmdline')
  addBoolOption('show_merged_command', 'showMergedCommand')

  // Header options
  addBoolOption('header_margin', 'headerMargin')
  addBoolOption('screen_tabs', 'screenTabs')
  addBoolOption('detailed_cpu_time', 'detailedCpuTime')
  addBoolOption('cpu_count_from_one', 'cpuCountFromOne')

  // CPU options
  addBoolOption('show_cpu_usage', 'showCpuUsage')
  addBoolOption('show_cpu_frequency', 'showCpuFrequency')
  addBoolOption('show_cpu_temperature', 'showCpuTemperature')
  addBoolOption('degree_fahrenheit', 'degreeFahrenheit')
  addBoolOption('update_process_names', 'updateProcessNames')
  addBoolOption('account_guest_in_cpu_meter', 'accountGuestInCpuMeter')
  addBoolOption('hide_running_in_container', 'hideRunningInContainer')
  addBoolOption('shadow_distribution_path_prefix', 'shadowDistributionPathPrefix')
  addBoolOption('show_cached_memory', 'showCachedMemory')
  addBoolOption('topology_affinity', 'topologyAffinity')

  // Function bar
  addOption('hide_function_bar', 'hideFunctionBar')

  // Meters (column 0 = left, column 1 = right)
  if (config.leftMeters.length > 0) {
    const { names, modes } = serializeMeters(config.leftMeters)
    lines.push(`column_meters_0=${names}`)
    lines.push(`column_meter_modes_0=${modes}`)
  }
  if (config.rightMeters.length > 0) {
    const { names, modes } = serializeMeters(config.rightMeters)
    lines.push(`column_meters_1=${names}`)
    lines.push(`column_meter_modes_1=${modes}`)
  }

  // Screen definitions (htop 3.x)
  if (config.screens.length > 0) {
    lines.push(...serializeScreens(config.screens))
  }

  // Unknown options (preserve for forward compatibility)
  if (includeUnknown && Object.keys(config.unknownOptions).length > 0) {
    for (const [key, value] of Object.entries(config.unknownOptions)) {
      lines.push(`${key}=${value}`)
    }
  }

  return lines.join('\n')
}
