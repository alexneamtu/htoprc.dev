/**
 * Meter display modes in htop
 */
export type MeterMode = 'bar' | 'text' | 'graph' | 'led'

/**
 * A meter in the htop header
 */
export interface Meter {
  type: string
  mode: MeterMode
}

/**
 * Screen definition for htop 3.x (Main, I/O, etc.)
 */
export interface ScreenDefinition {
  name: string
  columns: string[]
  sortKey?: string
  sortDirection?: 'asc' | 'desc'
  treeView?: boolean
}

/**
 * Header layout options
 */
export type HeaderLayout =
  | 'two_50_50'
  | 'two_33_67'
  | 'two_67_33'
  | 'three_33_34_33'
  | 'three_25_25_50'
  | 'three_25_50_25'
  | 'three_50_25_25'
  | 'four_25_25_25_25'

/**
 * Parsed htoprc configuration
 */
export interface HtopConfig {
  // Version
  htopVersion?: string
  configReaderMinVersion?: number

  // Display
  colorScheme: number
  headerLayout: HeaderLayout
  showProgramPath: boolean
  highlightBaseName: boolean
  highlightDeletedExe: boolean
  highlightMegabytes: boolean
  highlightThreads: boolean
  highlightChanges: boolean
  highlightChangesDelaySecs: number
  shadowOtherUsers: boolean
  showThreadNames: boolean
  showCpuUsage: boolean
  showCpuFrequency: boolean
  showCpuTemperature: boolean
  degreeFahrenheit: boolean
  updateProcessNames: boolean
  accountGuestInCpuMeter: boolean
  hideRunningInContainer: boolean
  shadowDistributionPathPrefix: boolean
  showCachedMemory: boolean
  topologyAffinity: boolean
  enableMouse: boolean
  delay: number
  hideFunctionBar: number
  headerMargin: boolean
  screenTabs: boolean
  detailedCpuTime: boolean
  cpuCountFromOne: boolean

  // Header meters
  leftMeters: Meter[]
  rightMeters: Meter[]

  // Process list
  columns: number[]
  sortKey: number
  sortDirection: 'asc' | 'desc'
  treeView: boolean
  treeSortKey: number
  treeSortDirection: 'asc' | 'desc'
  treeViewAlwaysByPid: boolean
  allBranchesCollapsed: boolean

  // Threading
  hideKernelThreads: boolean
  hideUserlandThreads: boolean

  // Command display
  findCommInCmdline: boolean
  stripExeFromCmdline: boolean
  showMergedCommand: boolean

  // Screen definitions (htop 3.x)
  screens: ScreenDefinition[]

  // Unknown options (preserved for forward compatibility)
  unknownOptions: Record<string, string>
}

/**
 * Parser warning for non-fatal issues
 */
export interface ParseWarning {
  line: number
  message: string
  type: 'unknown_option' | 'invalid_value' | 'deprecated'
}

/**
 * Parser error for fatal issues
 */
export interface ParseError {
  line: number
  message: string
}

/**
 * Result of parsing an htoprc file
 */
export interface ParseResult {
  config: HtopConfig
  warnings: ParseWarning[]
  errors: ParseError[]
  version: 'v2' | 'v3' | 'unknown'
  score: number
}
