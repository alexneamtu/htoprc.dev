import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HtopPreview } from './HtopPreview'
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

describe('HtopPreview', () => {
  it('renders the component', () => {
    const config = createConfig()
    const { container } = render(<HtopPreview config={config} />)

    expect(container.querySelector('.font-mono')).toBeInTheDocument()
  })

  describe('function bar', () => {
    it('shows function bar when hideFunctionBar is 0', () => {
      const config = createConfig({ hideFunctionBar: 0 })
      render(<HtopPreview config={config} />)

      expect(screen.getByText('F1')).toBeInTheDocument()
      expect(screen.getByText('Help')).toBeInTheDocument()
      expect(screen.getByText('F10')).toBeInTheDocument()
      expect(screen.getByText('Quit')).toBeInTheDocument()
    })

    it('hides function bar when hideFunctionBar is not 0', () => {
      const config = createConfig({ hideFunctionBar: 1 })
      render(<HtopPreview config={config} />)

      expect(screen.queryByText('F1')).not.toBeInTheDocument()
      expect(screen.queryByText('Help')).not.toBeInTheDocument()
    })
  })

  describe('header meters', () => {
    it('renders left meters', () => {
      const config = createConfig({
        leftMeters: [
          { type: 'CPU', mode: 'bar' },
          { type: 'Memory', mode: 'bar' },
        ],
      })
      render(<HtopPreview config={config} />)

      expect(screen.getByText('CPU')).toBeInTheDocument()
      expect(screen.getByText('Mem')).toBeInTheDocument()
    })

    it('renders right meters', () => {
      const config = createConfig({
        rightMeters: [
          { type: 'Tasks', mode: 'bar' },
          { type: 'LoadAverage', mode: 'bar' },
        ],
      })
      render(<HtopPreview config={config} />)

      expect(screen.getByText('Tasks:')).toBeInTheDocument()
      expect(screen.getByText(/Load average:/)).toBeInTheDocument()
    })
  })

  describe('color schemes', () => {
    // htop uses terminal colors, not its own color schemes
    // The preview uses consistent dark terminal colors regardless of color_scheme setting
    it('uses consistent dark terminal colors', () => {
      const config = createConfig({ colorScheme: 0 })
      const { container } = render(<HtopPreview config={config} />)

      // Check that CSS variables are set to dark terminal colors
      const preview = container.querySelector('.font-mono')
      expect(preview).toHaveStyle('--htop-bg: #0d0d0d')
    })

    it('uses same colors regardless of color scheme setting', () => {
      // htop's color_scheme refers to terminal color indices, not actual colors
      const config = createConfig({ colorScheme: 4 })
      const { container } = render(<HtopPreview config={config} />)

      const preview = container.querySelector('.font-mono')
      expect(preview).toHaveStyle('--htop-bg: #0d0d0d')
    })

    it('handles invalid color scheme gracefully', () => {
      const config = createConfig({ colorScheme: 99 })
      const { container } = render(<HtopPreview config={config} />)

      const preview = container.querySelector('.font-mono')
      expect(preview).toHaveStyle('--htop-bg: #0d0d0d')
    })
  })

  describe('process list', () => {
    it('renders process list headers', () => {
      const config = createConfig()
      render(<HtopPreview config={config} />)

      expect(screen.getByText('PID')).toBeInTheDocument()
      expect(screen.getByText('USER')).toBeInTheDocument()
      expect(screen.getByText('Command')).toBeInTheDocument()
    })

    it('renders process list with tree view when enabled', () => {
      const config = createConfig({ treeView: true })
      render(<HtopPreview config={config} />)

      // Tree characters should be present
      const treeChars = screen.getAllByText(/[├└│─]/)
      expect(treeChars.length).toBeGreaterThan(0)
    })
  })
})
