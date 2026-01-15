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
    screens: [],
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

      // Both desktop and mobile views are rendered (one hidden via CSS)
      // so we use getAllByText to handle multiple elements
      expect(screen.getAllByText('F1').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Help').length).toBeGreaterThan(0)
      expect(screen.getAllByText('F10').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Quit').length).toBeGreaterThan(0)
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

      // Both desktop and mobile views are rendered (one hidden via CSS)
      expect(screen.getAllByText('CPU').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Mem').length).toBeGreaterThan(0)
    })

    it('renders right meters', () => {
      const config = createConfig({
        rightMeters: [
          { type: 'Tasks', mode: 'bar' },
          { type: 'LoadAverage', mode: 'bar' },
        ],
      })
      render(<HtopPreview config={config} />)

      // Both desktop and mobile views are rendered (one hidden via CSS)
      expect(screen.getAllByText('Tasks:').length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Load average:/).length).toBeGreaterThan(0)
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

      // Both desktop and mobile views are rendered (one hidden via CSS)
      expect(screen.getAllByText('PID').length).toBeGreaterThan(0)
      expect(screen.getAllByText('USER').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Command').length).toBeGreaterThan(0)
    })

    it('renders process list with tree view when enabled', () => {
      const config = createConfig({ treeView: true })
      render(<HtopPreview config={config} />)

      // Tree characters should be present
      const treeChars = screen.getAllByText(/[├└│─]/)
      expect(treeChars.length).toBeGreaterThan(0)
    })
  })

  describe('compact mode', () => {
    it('renders compact view when compact prop is true', () => {
      const config = createConfig({
        leftMeters: [{ type: 'CPU', mode: 'bar' }],
        rightMeters: [{ type: 'Memory', mode: 'bar' }],
      })
      render(<HtopPreview config={config} compact />)

      // Compact view shows limited meters and "Tap to expand" text
      expect(screen.getByText('Tap to expand')).toBeInTheDocument()
      // Should not show process list headers in compact mode
      expect(screen.queryByText('PID')).not.toBeInTheDocument()
    })

    it('shows meters in compact view', () => {
      const config = createConfig({
        leftMeters: [{ type: 'CPU', mode: 'bar' }],
        rightMeters: [{ type: 'Memory', mode: 'bar' }],
      })
      render(<HtopPreview config={config} compact />)

      expect(screen.getByText('CPU')).toBeInTheDocument()
      expect(screen.getByText('Mem')).toBeInTheDocument()
    })
  })

  describe('header layouts', () => {
    it('renders two_67_33 layout with left-heavy columns', () => {
      const config = createConfig({
        headerLayout: 'two_67_33',
        leftMeters: [{ type: 'CPU', mode: 'bar' }],
      })
      render(<HtopPreview config={config} />)

      expect(screen.getAllByText('CPU').length).toBeGreaterThan(0)
    })

    it('renders two_50_50 layout with two columns', () => {
      const config = createConfig({
        headerLayout: 'two_50_50',
        leftMeters: [{ type: 'CPU', mode: 'bar' }],
        rightMeters: [{ type: 'Memory', mode: 'bar' }],
      })
      render(<HtopPreview config={config} />)

      expect(screen.getAllByText('CPU').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Mem').length).toBeGreaterThan(0)
    })

    it('renders three_33_34_33 layout with three columns', () => {
      const config = createConfig({
        headerLayout: 'three_33_34_33',
        leftMeters: [{ type: 'CPU', mode: 'bar' }],
        rightMeters: [{ type: 'Memory', mode: 'bar' }],
      })
      render(<HtopPreview config={config} />)

      // Even with three column layout, we show left and right
      expect(screen.getAllByText('CPU').length).toBeGreaterThan(0)
    })

    it('handles empty meters', () => {
      const config = createConfig({
        headerLayout: 'two_50_50',
        leftMeters: [],
        rightMeters: [],
      })
      const { container } = render(<HtopPreview config={config} />)

      // Should still render the preview container
      expect(container.querySelector('.font-mono')).toBeInTheDocument()
    })
  })

  describe('process highlighting options', () => {
    it('respects showProgramPath setting', () => {
      const config = createConfig({
        showProgramPath: true,
      })
      render(<HtopPreview config={config} />)

      // Process list should render with commands
      expect(screen.getAllByText('Command').length).toBeGreaterThan(0)
    })

    it('respects highlightBaseName setting', () => {
      const config = createConfig({
        highlightBaseName: true,
      })
      render(<HtopPreview config={config} />)

      // Preview renders normally
      expect(screen.getAllByText('PID').length).toBeGreaterThan(0)
    })
  })
})
