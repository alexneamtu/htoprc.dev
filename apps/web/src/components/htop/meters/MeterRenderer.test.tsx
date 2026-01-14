import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MeterRenderer } from './index'
import type { Meter } from '@htoprc/parser'

describe('MeterRenderer', () => {
  describe('CPU meters', () => {
    it('renders CPU meter in bar mode', () => {
      const meter: Meter = { type: 'CPU', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      // Should show CPU label
      expect(screen.getByText('CPU')).toBeInTheDocument()
    })

    it('renders CPU meter in text mode', () => {
      const meter: Meter = { type: 'CPU', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      // Text mode should show CPU with values
      expect(screen.getByText(/CPU:/)).toBeInTheDocument()
    })

    it('renders AllCPUs meter showing multiple cores', () => {
      const meter: Meter = { type: 'AllCPUs', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      // Should show multiple CPU bars (8 by default)
      const cpuLabels = screen.getAllByText(/^[0-7]$/)
      expect(cpuLabels.length).toBe(8)
    })
  })

  describe('Memory meter', () => {
    it('renders Memory meter in bar mode', () => {
      const meter: Meter = { type: 'Memory', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Mem')).toBeInTheDocument()
    })

    it('renders Memory meter in text mode', () => {
      const meter: Meter = { type: 'Memory', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText(/Mem:/)).toBeInTheDocument()
    })
  })

  describe('Swap meter', () => {
    it('renders Swap meter in bar mode', () => {
      const meter: Meter = { type: 'Swap', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Swp')).toBeInTheDocument()
    })
  })

  describe('Text meters', () => {
    it('renders Tasks meter', () => {
      const meter: Meter = { type: 'Tasks', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Tasks:')).toBeInTheDocument()
    })

    it('renders LoadAverage meter', () => {
      const meter: Meter = { type: 'LoadAverage', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Load:')).toBeInTheDocument()
    })

    it('renders Uptime meter', () => {
      const meter: Meter = { type: 'Uptime', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Uptime:')).toBeInTheDocument()
    })

    it('renders Clock meter', () => {
      const meter: Meter = { type: 'Clock', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Time:')).toBeInTheDocument()
    })

    it('renders Hostname meter', () => {
      const meter: Meter = { type: 'Hostname', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Host:')).toBeInTheDocument()
    })

    it('renders DiskIO meter', () => {
      const meter: Meter = { type: 'DiskIO', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Disk:')).toBeInTheDocument()
    })

    it('renders NetworkIO meter', () => {
      const meter: Meter = { type: 'NetworkIO', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Net:')).toBeInTheDocument()
    })
  })

  describe('Unknown meters', () => {
    it('renders unknown meter with generic fallback', () => {
      const meter: Meter = { type: 'UnknownMeter', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('UnknownMeter')).toBeInTheDocument()
    })
  })
})
