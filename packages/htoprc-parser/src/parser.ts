import type { ParseResult, HtopConfig, Meter, ParseWarning, MeterMode, ScreenDefinition } from './types'

/**
 * Known htoprc option names
 */
const KNOWN_OPTIONS = new Set([
  'htop_version',
  'config_reader_min_version',
  'fields',
  'sort_key',
  'sort_direction',
  'tree_sort_key',
  'tree_sort_direction',
  'hide_kernel_threads',
  'hide_userland_threads',
  'hide_running_in_container',
  'shadow_other_users',
  'show_thread_names',
  'show_program_path',
  'highlight_base_name',
  'highlight_deleted_exe',
  'shadow_distribution_path_prefix',
  'highlight_megabytes',
  'highlight_threads',
  'highlight_changes',
  'highlight_changes_delay_secs',
  'find_comm_in_cmdline',
  'strip_exe_from_cmdline',
  'show_merged_command',
  'header_margin',
  'screen_tabs',
  'detailed_cpu_time',
  'cpu_count_from_one',
  'show_cpu_usage',
  'show_cpu_frequency',
  'show_cpu_temperature',
  'show_cached_memory',
  'degree_fahrenheit',
  'update_process_names',
  'account_guest_in_cpu_meter',
  'topology_affinity',
  'color_scheme',
  'enable_mouse',
  'delay',
  'hide_function_bar',
  'header_layout',
  'tree_view',
  'tree_view_always_by_pid',
  'all_branches_collapsed',
  // Meter columns (0-9 supported)
  ...Array.from({ length: 10 }, (_, i) => `column_meters_${i}`),
  ...Array.from({ length: 10 }, (_, i) => `column_meter_modes_${i}`),
])

/**
 * Check if an option key is known (including dynamic patterns)
 */
function isKnownOption(key: string): boolean {
  // Check static known options
  if (KNOWN_OPTIONS.has(key)) {
    return true
  }

  // htop 3.x screen definitions: screen:ScreenName
  if (key.startsWith('screen:')) {
    return true
  }

  // htop 3.x screen-specific options (dot-prefixed)
  if (key.startsWith('.')) {
    return true
  }

  // htop 2.x meter options
  if (key.startsWith('left_meters') || key.startsWith('left_meter_modes')) {
    return true
  }
  if (key.startsWith('right_meters') || key.startsWith('right_meter_modes')) {
    return true
  }

  return false
}

/**
 * Default htoprc configuration values
 */
export const DEFAULT_CONFIG: HtopConfig = {
  colorScheme: 0,
  headerLayout: 'two_50_50',
  showProgramPath: true,
  highlightBaseName: false,
  highlightDeletedExe: true,
  highlightMegabytes: true,
  highlightThreads: true,
  highlightChanges: false,
  highlightChangesDelaySecs: 5,
  shadowOtherUsers: false,
  showThreadNames: false,
  showCpuUsage: true,
  showCpuFrequency: false,
  showCpuTemperature: false,
  degreeFahrenheit: false,
  updateProcessNames: false,
  accountGuestInCpuMeter: false,
  enableMouse: true,
  delay: 15,
  hideFunctionBar: 0,
  headerMargin: true,
  screenTabs: true,
  detailedCpuTime: false,
  cpuCountFromOne: false,
  leftMeters: [],
  rightMeters: [],
  columns: [],
  sortKey: 46,
  sortDirection: 'desc',
  treeView: false,
  treeSortKey: 0,
  treeSortDirection: 'asc',
  treeViewAlwaysByPid: false,
  allBranchesCollapsed: false,
  hideKernelThreads: true,
  hideUserlandThreads: false,
  findCommInCmdline: true,
  stripExeFromCmdline: true,
  showMergedCommand: false,
  screens: [],
  unknownOptions: {},
}

/**
 * Convert meter mode number to MeterMode type
 */
function meterModeFromNumber(mode: number): MeterMode {
  switch (mode) {
    case 1:
      return 'bar'
    case 2:
      return 'text'
    case 3:
      return 'graph'
    case 4:
      return 'led'
    default:
      return 'bar'
  }
}

/**
 * Parse meters from column_meters_X and column_meter_modes_X
 */
function parseMeters(meterNames: string[], meterModes: number[]): Meter[] {
  return meterNames.map((name, index) => ({
    type: name,
    mode: meterModeFromNumber(meterModes[index] ?? 1),
  }))
}

/**
 * Calculate interestingness score for a config
 */
function calculateScore(config: HtopConfig): number {
  let score = 0

  // Custom color scheme: +10
  if (config.colorScheme !== 0) {
    score += 10
  }

  // Tree view enabled: +5
  if (config.treeView) {
    score += 5
  }

  // Custom meters: +5 per non-empty meter column
  if (config.leftMeters.length > 0) {
    score += 5
  }
  if (config.rightMeters.length > 0) {
    score += 5
  }

  // Many columns: +3 if more than 8 columns
  if (config.columns.length > 8) {
    score += 3
  }

  // Custom header layout: +3
  if (config.headerLayout !== 'two_50_50') {
    score += 3
  }

  return score
}

/**
 * Parse an htoprc configuration string
 */
export function parseHtoprc(input: string): ParseResult {
  const config: HtopConfig = { ...DEFAULT_CONFIG, unknownOptions: {}, screens: [] }
  const warnings: ParseWarning[] = []
  const errors: never[] = []
  let version: 'v2' | 'v3' | 'unknown' = 'unknown'

  // Temporary storage for meter parsing
  const meterColumns: Record<number, string[]> = {}
  const meterModes: Record<number, number[]> = {}

  // Current screen being parsed (for dot-prefixed options)
  let currentScreen: ScreenDefinition | null = null

  const lines = input.split('\n')

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]?.trim() ?? ''

    // Skip empty lines and comments
    if (line === '' || line.startsWith('#')) {
      continue
    }

    // Parse key=value
    const equalsIndex = line.indexOf('=')
    if (equalsIndex === -1) {
      continue
    }

    const key = line.slice(0, equalsIndex).trim()
    const value = line.slice(equalsIndex + 1).trim()

    // Handle screen definitions (screen:Name=columns)
    if (key.startsWith('screen:')) {
      const screenName = key.slice(7) // Remove 'screen:' prefix
      currentScreen = {
        name: screenName,
        columns: value.split(' ').filter((s) => s !== ''),
      }
      config.screens.push(currentScreen)
      continue
    }

    // Handle screen-specific options (dot-prefixed, applies to current screen)
    if (key.startsWith('.') && currentScreen) {
      const optionName = key.slice(1) // Remove '.' prefix
      switch (optionName) {
        case 'sort_key':
          currentScreen.sortKey = value
          break
        case 'sort_direction':
          currentScreen.sortDirection = value === '1' ? 'asc' : 'desc'
          break
        case 'tree_view':
          currentScreen.treeView = value === '1'
          break
      }
      continue
    }

    // Check for unknown options
    if (!isKnownOption(key)) {
      warnings.push({
        line: lineNum + 1,
        message: `Unknown option: ${key}`,
        type: 'unknown_option',
      })
      config.unknownOptions[key] = value
      continue
    }

    // Parse known options
    switch (key) {
      case 'htop_version':
        config.htopVersion = value
        break

      case 'config_reader_min_version':
        config.configReaderMinVersion = parseInt(value, 10)
        if (config.configReaderMinVersion >= 3) {
          version = 'v3'
        } else if (config.configReaderMinVersion === 2) {
          version = 'v2'
        }
        break

      case 'color_scheme':
        config.colorScheme = parseInt(value, 10)
        break

      case 'tree_view':
        config.treeView = value === '1'
        break

      case 'hide_kernel_threads':
        config.hideKernelThreads = value === '1'
        break

      case 'hide_userland_threads':
        config.hideUserlandThreads = value === '1'
        break

      case 'shadow_other_users':
        config.shadowOtherUsers = value === '1'
        break

      case 'show_thread_names':
        config.showThreadNames = value === '1'
        break

      case 'show_program_path':
        config.showProgramPath = value === '1'
        break

      case 'highlight_base_name':
        config.highlightBaseName = value === '1'
        break

      case 'highlight_deleted_exe':
        config.highlightDeletedExe = value === '1'
        break

      case 'highlight_megabytes':
        config.highlightMegabytes = value === '1'
        break

      case 'highlight_threads':
        config.highlightThreads = value === '1'
        break

      case 'highlight_changes':
        config.highlightChanges = value === '1'
        break

      case 'highlight_changes_delay_secs':
        config.highlightChangesDelaySecs = parseInt(value, 10)
        break

      case 'find_comm_in_cmdline':
        config.findCommInCmdline = value === '1'
        break

      case 'strip_exe_from_cmdline':
        config.stripExeFromCmdline = value === '1'
        break

      case 'show_merged_command':
        config.showMergedCommand = value === '1'
        break

      case 'header_margin':
        config.headerMargin = value === '1'
        break

      case 'screen_tabs':
        config.screenTabs = value === '1'
        break

      case 'detailed_cpu_time':
        config.detailedCpuTime = value === '1'
        break

      case 'cpu_count_from_one':
        config.cpuCountFromOne = value === '1'
        break

      case 'show_cpu_usage':
        config.showCpuUsage = value === '1'
        break

      case 'show_cpu_frequency':
        config.showCpuFrequency = value === '1'
        break

      case 'show_cpu_temperature':
        config.showCpuTemperature = value === '1'
        break

      case 'degree_fahrenheit':
        config.degreeFahrenheit = value === '1'
        break

      case 'update_process_names':
        config.updateProcessNames = value === '1'
        break

      case 'account_guest_in_cpu_meter':
        config.accountGuestInCpuMeter = value === '1'
        break

      case 'enable_mouse':
        config.enableMouse = value === '1'
        break

      case 'delay':
        config.delay = parseInt(value, 10)
        break

      case 'hide_function_bar':
        config.hideFunctionBar = parseInt(value, 10)
        break

      case 'header_layout':
        config.headerLayout = value as typeof config.headerLayout
        break

      case 'sort_key':
        config.sortKey = parseInt(value, 10)
        break

      case 'sort_direction':
        config.sortDirection = value === '1' ? 'asc' : 'desc'
        break

      case 'tree_sort_key':
        config.treeSortKey = parseInt(value, 10)
        break

      case 'tree_sort_direction':
        config.treeSortDirection = value === '1' ? 'asc' : 'desc'
        break

      case 'tree_view_always_by_pid':
        config.treeViewAlwaysByPid = value === '1'
        break

      case 'all_branches_collapsed':
        config.allBranchesCollapsed = value === '1'
        break

      case 'fields':
        config.columns = value.split(' ').map((s) => parseInt(s, 10))
        break

      default:
        // Handle column_meters_X and column_meter_modes_X
        if (key.startsWith('column_meters_')) {
          const colIndex = parseInt(key.replace('column_meters_', ''), 10)
          meterColumns[colIndex] = value.split(' ').filter((s) => s !== '')
        } else if (key.startsWith('column_meter_modes_')) {
          const colIndex = parseInt(key.replace('column_meter_modes_', ''), 10)
          meterModes[colIndex] = value.split(' ').map((s) => parseInt(s, 10))
        }
        break
    }
  }

  // Parse meters from collected data
  // Column 0 = left meters, Column 1 = right meters (in typical two-column layout)
  if (meterColumns[0]) {
    config.leftMeters = parseMeters(meterColumns[0], meterModes[0] ?? [])
  }
  if (meterColumns[1]) {
    config.rightMeters = parseMeters(meterColumns[1], meterModes[1] ?? [])
  }

  const score = calculateScore(config)

  return {
    config,
    warnings,
    errors,
    version,
    score,
  }
}
