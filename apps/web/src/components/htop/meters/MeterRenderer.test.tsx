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

  describe('Additional meters', () => {
    it('renders Blank meter', () => {
      const meter: Meter = { type: 'Blank', mode: 'bar' }
      const { container } = render(<MeterRenderer meter={meter} />)

      // Blank meter should render an empty div with height
      expect(container.querySelector('.h-4')).toBeInTheDocument()
    })

    it('renders Date meter', () => {
      const meter: Meter = { type: 'Date', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      // Date meter should show current date
      const dateRegex = /\w{3}, \w{3} \d{1,2}/
      expect(screen.getByText(dateRegex)).toBeInTheDocument()
    })

    it('renders DateTime meter', () => {
      const meter: Meter = { type: 'DateTime', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      // DateTime meter should show date and time
      const dateTimeRegex = /\w{3}, \w{3} \d{1,2}/
      expect(screen.getByText(dateTimeRegex)).toBeInTheDocument()
    })

    it('renders Battery meter in bar mode', () => {
      const meter: Meter = { type: 'Battery', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('Bat')).toBeInTheDocument()
    })

    it('renders Battery meter in text mode', () => {
      const meter: Meter = { type: 'Battery', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText(/Battery:/)).toBeInTheDocument()
    })

    it('renders SysArch meter', () => {
      const meter: Meter = { type: 'SysArch', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText(/Linux.*x86_64/)).toBeInTheDocument()
    })

    it('renders FileDescriptors meter in bar mode', () => {
      const meter: Meter = { type: 'FileDescriptors', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('FD')).toBeInTheDocument()
    })

    it('renders FileDescriptors meter in text mode', () => {
      const meter: Meter = { type: 'FileDescriptors', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText(/FDs:/)).toBeInTheDocument()
    })

    it('renders SELinux meter', () => {
      const meter: Meter = { type: 'SELinux', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText(/SELinux:/)).toBeInTheDocument()
    })

    it('renders Systemd meter', () => {
      const meter: Meter = { type: 'Systemd', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText(/Systemd:/)).toBeInTheDocument()
    })

    it('renders GPU meter in bar mode', () => {
      const meter: Meter = { type: 'GPU', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('GPU')).toBeInTheDocument()
    })

    it('renders GPU meter in text mode', () => {
      const meter: Meter = { type: 'GPU', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText(/GPU:/)).toBeInTheDocument()
    })

    it('renders Pressure meter in bar mode', () => {
      const meter: Meter = { type: 'Pressure', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      // Pressure meter may show either 'Pressure' or 'Dis' (disabled)
      const hasPressureOrDis = screen.queryByText('Pressure') || screen.queryByText('Dis')
      expect(hasPressureOrDis).toBeInTheDocument()
    })

    it('renders Zram meter in bar mode', () => {
      const meter: Meter = { type: 'Zram', mode: 'bar' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText('zrm')).toBeInTheDocument()
    })

    it('renders Zram meter in text mode', () => {
      const meter: Meter = { type: 'Zram', mode: 'text' }
      render(<MeterRenderer meter={meter} />)

      expect(screen.getByText(/Zram:/)).toBeInTheDocument()
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
