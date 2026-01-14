import type { ParseResult, HtopConfig, Meter, ParseWarning, HeaderLayout } from './types'

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
  unknownOptions: {},
}

/**
 * Parse an htoprc configuration string
 */
export function parseHtoprc(input: string): ParseResult {
  const config: HtopConfig = { ...DEFAULT_CONFIG, unknownOptions: {} }
  const warnings: ParseWarning[] = []
  const errors: never[] = []

  // TODO: Implement parsing
  // This is a stub that returns defaults
  // Tests should fail because parsing isn't implemented

  return {
    config,
    warnings,
    errors,
    version: 'unknown',
    score: 0,
  }
}
