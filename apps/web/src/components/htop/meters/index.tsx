import type { Meter } from '@htoprc/parser'
import { secureRandom } from '../../../utils/random'
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
  PressureMeter,
  ZramMeter,
  BlankMeter,
  DateMeter,
  DateTimeMeter,
  BatteryMeter,
  SysArchMeter,
  FileDescriptorMeter,
  SELinuxMeter,
  SystemdMeter,
  GPUMeter,
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
    case 'LeftCPUs':
    case 'LeftCPUs2':
    case 'LeftCPUs4':
    case 'LeftCPUs8':
    case 'RightCPUs':
    case 'RightCPUs2':
    case 'RightCPUs4':
    case 'RightCPUs8':
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

    case 'Pressure':
      return <PressureMeter meter={meter} />

    case 'Zram':
      return <ZramMeter meter={meter} />

    case 'Blank':
      return <BlankMeter />

    case 'Date':
      return <DateMeter />

    case 'DateTime':
      return <DateTimeMeter />

    case 'Battery':
      return <BatteryMeter meter={meter} />

    case 'SysArch':
      return <SysArchMeter />

    case 'FileDescriptors':
      return <FileDescriptorMeter meter={meter} />

    case 'SELinux':
      return <SELinuxMeter />

    case 'Systemd':
      return <SystemdMeter />

    case 'GPU':
      return <GPUMeter meter={meter} />

    default:
      // Generic fallback for unknown meters
      return <GenericMeter meter={meter} />
  }
}

function getCpuCount(meterType: string): number {
  // Check if it's a Left/Right variant (without number suffix)
  const isLeftRightBase = meterType === 'LeftCPUs' || meterType === 'RightCPUs'

  // Handle Left/Right variants the same as All variants for numbered ones
  const normalizedType = meterType
    .replace('LeftCPUs', 'AllCPUs')
    .replace('RightCPUs', 'AllCPUs')

  switch (normalizedType) {
    case 'AllCPUs2':
      return 2
    case 'AllCPUs4':
      return 4
    case 'AllCPUs8':
      return 8
    case 'AllCPUs':
      // LeftCPUs/RightCPUs without number default to 4 for split preview
      // AllCPUs without number defaults to 8
      return isLeftRightBase ? 4 : 8
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
  const mockValue = secureRandom() * 100

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
  PressureMeter,
  ZramMeter,
  BlankMeter,
  DateMeter,
  DateTimeMeter,
  BatteryMeter,
  SysArchMeter,
  FileDescriptorMeter,
  SELinuxMeter,
  SystemdMeter,
  GPUMeter,
} from './TextMeters'
