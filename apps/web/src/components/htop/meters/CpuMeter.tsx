import type { Meter } from '@htoprc/parser'

interface CpuMeterProps {
  meter: Meter
  cpuCount?: number
}

// Mock CPU data per core with frequency and temp
function getMockCpuData(cpuCount: number) {
  return Array.from({ length: cpuCount }, (_, i) => ({
    user: Math.random() * 30 + 5,
    system: Math.random() * 15 + 2,
    nice: Math.random() * 5,
    iowait: Math.random() * 3,
    frequency: 3400 + Math.floor(Math.random() * 400),
    temp: 40 + Math.floor(Math.random() * 30),
  }))
}

// htop-style bar using pipe characters
function HtopBar({
  percentage,
  width = 40,
  colorClass = 'text-green-400',
}: {
  percentage: number
  width?: number
  colorClass?: string
}) {
  const filled = Math.round((percentage / 100) * width)
  const empty = width - filled
  const bar = '|'.repeat(filled) + ' '.repeat(empty)

  return (
    <span className="font-mono">
      <span className="text-cyan-400">[</span>
      <span className={colorClass}>{bar}</span>
      <span className="text-cyan-400">]</span>
    </span>
  )
}

function CpuBarLine({
  user,
  system,
  nice,
  iowait,
  label,
  frequency,
  temp,
  showExtras = false,
}: {
  user: number
  system: number
  nice: number
  iowait: number
  label: string
  frequency?: number
  temp?: number
  showExtras?: boolean
}) {
  const total = user + system + nice + iowait
  const barWidth = 30
  const userWidth = Math.round((user / 100) * barWidth)
  const sysWidth = Math.round((system / 100) * barWidth)
  const niceWidth = Math.round((nice / 100) * barWidth)
  const ioWidth = Math.round((iowait / 100) * barWidth)
  const emptyWidth = barWidth - userWidth - sysWidth - niceWidth - ioWidth

  return (
    <div className="flex items-center text-xs font-mono whitespace-nowrap">
      <span className="w-3 text-cyan-400">{label}</span>
      <span className="text-cyan-400">[</span>
      <span className="text-green-400">{'|'.repeat(Math.max(0, userWidth))}</span>
      <span className="text-red-400">{'|'.repeat(Math.max(0, sysWidth))}</span>
      <span className="text-cyan-300">{'|'.repeat(Math.max(0, niceWidth))}</span>
      <span className="text-yellow-600">{'|'.repeat(Math.max(0, ioWidth))}</span>
      <span>{' '.repeat(Math.max(0, emptyWidth))}</span>
      <span className="text-cyan-400">]</span>
      <span className="text-gray-300 ml-1">{total.toFixed(1)}%</span>
      {showExtras && frequency && (
        <span className="text-cyan-400 ml-1">{frequency}MHz</span>
      )}
      {showExtras && temp && (
        <span className="text-yellow-400 ml-1">{temp}°C</span>
      )}
    </div>
  )
}

export function CpuMeter({ meter, cpuCount = 4 }: CpuMeterProps) {
  const isAllCpus = meter.type.startsWith('AllCPU')
  const cpuData = getMockCpuData(isAllCpus ? cpuCount : 1)

  if (meter.mode === 'text') {
    const avgUser = cpuData.reduce((sum, cpu) => sum + cpu.user, 0) / cpuData.length
    const avgSystem = cpuData.reduce((sum, cpu) => sum + cpu.system, 0) / cpuData.length
    const avgTotal = avgUser + avgSystem
    return (
      <div className="text-xs font-mono">
        <span className="text-gray-400">CPU</span>
        <span className="text-cyan-400">[</span>
        <span className="text-green-400">{avgUser.toFixed(1)}%</span>
        <span className="text-gray-500">/</span>
        <span className="text-red-400">{avgSystem.toFixed(1)}%</span>
        <span className="text-cyan-400">]</span>
        <span className="text-gray-300 ml-1">{avgTotal.toFixed(1)}%</span>
      </div>
    )
  }

  if (meter.mode === 'graph') {
    // ASCII-style mini graph like real htop
    const graphHistory = Array.from({ length: 20 }, () => Math.random() * 60 + 10)
    const bars = '▁▂▃▄▅▆▇█'

    return (
      <div className="text-xs font-mono flex items-center">
        <span className="text-cyan-400">CPU</span>
        <span className="text-cyan-400">[</span>
        <span className="tracking-tight">
          {graphHistory.map((val, i) => {
            const barIndex = Math.min(Math.floor(val / 12.5), 7)
            return (
              <span key={i} className="text-green-400">
                {bars[barIndex]}
              </span>
            )
          })}
        </span>
        <span className="text-cyan-400">]</span>
      </div>
    )
  }

  // Default: bar mode - show individual CPU bars like real htop
  if (isAllCpus) {
    return (
      <div className="space-y-px">
        {cpuData.map((cpu, i) => (
          <CpuBarLine
            key={i}
            user={cpu.user}
            system={cpu.system}
            nice={cpu.nice}
            iowait={cpu.iowait}
            label={`${i}`}
            frequency={cpu.frequency}
            temp={cpu.temp}
            showExtras={true}
          />
        ))}
      </div>
    )
  }

  // Single CPU meter
  const cpu = cpuData[0]!
  return (
    <CpuBarLine
      user={cpu.user}
      system={cpu.system}
      nice={cpu.nice}
      iowait={cpu.iowait}
      label="CPU"
      frequency={cpu.frequency}
      temp={cpu.temp}
      showExtras={true}
    />
  )
}
