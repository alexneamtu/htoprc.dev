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

      // Text mode should show CPU with values in bracket format
      expect(screen.getByText('CPU')).toBeInTheDocument()
    })

    it('renders AllCPUs meter showing multiple cores', () => {
      const meter: Meter = { type: 'AllCPUs', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      // Should show multiple CPU bars (8 by default)
      const cpuLabels = screen.getAllByText(/^[0-7]$/)
      expect(cpuLabels.length).toBe(8)
    })

    it('renders CPU meter in graph mode', () => {
      const meter: Meter = { type: 'CPU', mode: 'graph' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('CPU')).toBeInTheDocument()
    })

    it('renders AllCPUs2 meter', () => {
      const meter: Meter = { type: 'AllCPUs2', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      // AllCPUs2 renders 2 CPU bars
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('renders AllCPUs4 meter', () => {
      const meter: Meter = { type: 'AllCPUs4', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      // AllCPUs4 renders 4 CPU bars
      const cpuLabels = screen.getAllByText(/^[0-3]$/)
      expect(cpuLabels.length).toBe(4)
    })

    it('renders AllCPUs8 meter', () => {
      const meter: Meter = { type: 'AllCPUs8', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      // AllCPUs8 renders 8 CPU bars
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

    it('renders Memory meter in graph mode', () => {
      const meter: Meter = { type: 'Memory', mode: 'graph' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Mem')).toBeInTheDocument()
    })
  })

  describe('Swap meter', () => {
    it('renders Swap meter in bar mode', () => {
      const meter: Meter = { type: 'Swap', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Swp')).toBeInTheDocument()
    })

    it('renders Swap meter in text mode', () => {
      const meter: Meter = { type: 'Swap', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText(/Swp:/)).toBeInTheDocument()
    })

    it('renders Swap meter in graph mode', () => {
      const meter: Meter = { type: 'Swap', mode: 'graph' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Swp')).toBeInTheDocument()
    })
  })

  describe('Text meters', () => {
    it('renders Tasks meter in bar mode', () => {
      const meter: Meter = { type: 'Tasks', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Tasks:')).toBeInTheDocument()
    })

    it('renders Tasks meter in text mode', () => {
      const meter: Meter = { type: 'Tasks', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText(/Tasks:/)).toBeInTheDocument()
    })

    it('renders LoadAverage meter in bar mode', () => {
      const meter: Meter = { type: 'LoadAverage', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText(/Load average:/)).toBeInTheDocument()
    })

    it('renders LoadAverage meter in text mode', () => {
      const meter: Meter = { type: 'LoadAverage', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText(/Load average:/)).toBeInTheDocument()
    })

    it('renders Uptime meter in bar mode', () => {
      const meter: Meter = { type: 'Uptime', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Uptime:')).toBeInTheDocument()
    })

    it('renders Uptime meter in text mode', () => {
      const meter: Meter = { type: 'Uptime', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText(/Uptime:/)).toBeInTheDocument()
    })

    it('renders Clock meter in bar mode', () => {
      const meter: Meter = { type: 'Clock', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Time:')).toBeInTheDocument()
    })

    it('renders Clock meter in text mode', () => {
      const meter: Meter = { type: 'Clock', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      // In text mode, Clock shows time without label
      expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument()
    })

    it('renders Hostname meter in bar mode', () => {
      const meter: Meter = { type: 'Hostname', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Host:')).toBeInTheDocument()
    })

    it('renders Hostname meter in text mode', () => {
      const meter: Meter = { type: 'Hostname', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('dev-workstation')).toBeInTheDocument()
    })

    it('renders DiskIO meter in bar mode', () => {
      const meter: Meter = { type: 'DiskIO', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Disk IO')).toBeInTheDocument()
    })

    it('renders DiskIO meter in text mode', () => {
      const meter: Meter = { type: 'DiskIO', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText(/IO:/)).toBeInTheDocument()
    })

    it('renders NetworkIO meter in bar mode', () => {
      const meter: Meter = { type: 'NetworkIO', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Network IO')).toBeInTheDocument()
    })

    it('renders NetworkIO meter in text mode', () => {
      const meter: Meter = { type: 'NetworkIO', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText(/Net:/)).toBeInTheDocument()
    })
  })

  describe('Unknown meters', () => {
    it('renders unknown meter in bar mode with generic fallback', () => {
      const meter: Meter = { type: 'UnknownMeter', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('UnknownMeter')).toBeInTheDocument()
    })

    it('renders unknown meter in text mode', () => {
      const meter: Meter = { type: 'UnknownMeter', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('UnknownMeter')).toBeInTheDocument()
    })
  })
})
