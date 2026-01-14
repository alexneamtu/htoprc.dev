import type { Meter } from '@htoprc/parser'
import { CpuMeter } from './CpuMeter'
import { MemoryMeter } from './MemoryMeter'
import { SwapMeter } from './SwapMeter'
import {
  TasksMeter,
  LoadAverageMeter,
  UptimeMeter,
  ClockMeter,
  HostnameMeter,
  DiskIOMeter,
  NetworkIOMeter,
} from './TextMeters'

interface MeterRendererProps {
  meter: Meter
}

export function MeterRenderer({ meter }: MeterRendererProps) {
  switch (meter.type) {
    case 'CPU':
    case 'AllCPUs':
    case 'AllCPUs2':
    case 'AllCPUs4':
    case 'AllCPUs8':
      return <CpuMeter meter={meter} cpuCount={getCpuCount(meter.type)} />

    case 'Memory':
      return <MemoryMeter meter={meter} />

    case 'Swap':
      return <SwapMeter meter={meter} />

    case 'Tasks':
      return <TasksMeter meter={meter} />

    case 'LoadAverage':
      return <LoadAverageMeter meter={meter} />

    case 'Uptime':
      return <UptimeMeter meter={meter} />

    case 'Clock':
      return <ClockMeter meter={meter} />

    case 'Hostname':
      return <HostnameMeter meter={meter} />

    case 'DiskIO':
      return <DiskIOMeter meter={meter} />

    case 'NetworkIO':
      return <NetworkIOMeter meter={meter} />

    default:
      // Generic fallback for unknown meters
      return <GenericMeter meter={meter} />
  }
}

function getCpuCount(meterType: string): number {
  switch (meterType) {
    case 'AllCPUs2':
      return 2
    case 'AllCPUs4':
      return 4
    case 'AllCPUs8':
      return 8
    case 'AllCPUs':
      return 8 // Default to 8 cores for preview
    default:
      return 1
  }
}

function GenericMeter({ meter }: MeterRendererProps) {
  if (meter.mode === 'text') {
    return (
      <div className="text-xs">
        <span className="text-gray-400">{meter.type}</span>
      </div>
    )
  }

  // Bar mode fallback
  const mockValue = Math.random() * 100

  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="w-12 text-gray-400 truncate">{meter.type}</span>
      <div className="flex-1 h-2 bg-gray-800 rounded-sm overflow-hidden">
        <div className="h-full bg-gray-500" style={{ width: `${mockValue}%` }} />
      </div>
      <span className="w-10 text-right text-gray-500">{mockValue.toFixed(0)}%</span>
    </div>
  )
}

export { CpuMeter } from './CpuMeter'
export { MemoryMeter } from './MemoryMeter'
export { SwapMeter } from './SwapMeter'
export {
  TasksMeter,
  LoadAverageMeter,
  UptimeMeter,
  ClockMeter,
  HostnameMeter,
  DiskIOMeter,
  NetworkIOMeter,
} from './TextMeters'
