import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProcessList } from './ProcessList'
import type { HtopConfig } from '@htoprc/parser'

// Helper to create a minimal config for testing
function createConfig(overrides: Partial<HtopConfig> = {}): HtopConfig {
  return {
    colorScheme: 0,
    headerLayout: 'two_50_50',
    leftMeters: [],
    rightMeters: [],
    columns: [],
    treeView: false,
    hideKernelThreads: false,
    hideUserlandThreads: false,
    shadowOtherUsers: false,
    showThreadNames: false,
    showProgramPath: true,
    highlightBaseName: false,
    highlightDeletedExe: false,
    highlightMegabytes: false,
    highlightThreads: true,
    highlightChanges: false,
    highlightChangesDelaySecs: 5,
    findCommInCmdline: false,
    stripExeFromCmdline: false,
    showMergedCommand: false,
    updateProcessNames: false,
    accountGuestInCpuMeter: false,
    enableMouse: true,
    delay: 15,
    hideFunctionBar: 0,
    headerMargin: true,
    sortKey: 0,
    sortDirection: 'desc',
    treeSortKey: 0,
    treeSortDirection: 'asc',
    treeViewAlwaysByPid: false,
    allBranchesCollapsed: false,
    screenTabs: false,
    detailedCpuTime: false,
    cpuCountFromOne: false,
    showCpuUsage: false,
    showCpuFrequency: false,
    showCpuTemperature: false,
    degreeFahrenheit: false,
    unknownOptions: {},
    ...overrides,
  }
}

describe('ProcessList', () => {
  it('renders the column headers', () => {
    const config = createConfig()
    render(<ProcessList config={config} />)

    expect(screen.getByText('PID')).toBeInTheDocument()
    expect(screen.getByText('USER')).toBeInTheDocument()
    expect(screen.getByText('CPU%')).toBeInTheDocument()
    expect(screen.getByText('MEM%')).toBeInTheDocument()
    expect(screen.getByText('TIME+')).toBeInTheDocument()
    expect(screen.getByText('Command')).toBeInTheDocument()
  })

  it('renders process rows', () => {
    const config = createConfig()
    render(<ProcessList config={config} />)

    // Should show some mock PIDs
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('htop')).toBeInTheDocument()
  })

  describe('tree view', () => {
    it('renders flat list when treeView is false', () => {
      const config = createConfig({ treeView: false })
      render(<ProcessList config={config} />)

      // Should not have tree characters
      expect(screen.queryByText(/[├└│]/)).not.toBeInTheDocument()
    })

    it('renders tree with box-drawing characters when treeView is true', () => {
      const config = createConfig({ treeView: true })
      render(<ProcessList config={config} />)

      // Should have tree characters in the DOM (multiple elements expected)
      const treeChars = screen.getAllByText(/[├└│─]/)
      expect(treeChars.length).toBeGreaterThan(0)
    })

    it('shows child processes indented under parents in tree view', () => {
      const config = createConfig({ treeView: true })
      const { container } = render(<ProcessList config={config} />)

      // Look for tree prefix characters which indicate hierarchy
      const rows = container.querySelectorAll('[class*="flex hover"]')
      expect(rows.length).toBeGreaterThan(0)
    })
  })

  describe('command highlighting', () => {
    it('shows full command when highlightBaseName is false', () => {
      const config = createConfig({ highlightBaseName: false })
      render(<ProcessList config={config} />)

      // Should show full path in command
      expect(screen.getByText(/\/sbin\/init/)).toBeInTheDocument()
    })

    it('highlights base name when highlightBaseName is true', () => {
      const config = createConfig({ highlightBaseName: true })
      render(<ProcessList config={config} />)

      // The base name should still be visible
      expect(screen.getByText('init')).toBeInTheDocument()
    })
  })

  it('highlights high CPU processes', () => {
    const config = createConfig()
    const { container } = render(<ProcessList config={config} />)

    // Processes with CPU > 20 should have red text
    const redCells = container.querySelectorAll('[style*="rgb(255, 85, 85)"]')
    expect(redCells.length).toBeGreaterThan(0)
  })
})
