import type { Meter } from '@htoprc/parser'

interface CpuMeterProps {
  meter: Meter
  cpuCount?: number
}

// Mock CPU data per core
function getMockCpuData(cpuCount: number) {
  return Array.from({ length: cpuCount }, () => ({
    user: Math.random() * 30 + 5,
    system: Math.random() * 15 + 2,
    nice: Math.random() * 5,
    iowait: Math.random() * 3,
  }))
}

function CpuBarSegment({
  user,
  system,
  nice,
  iowait,
  label,
}: {
  user: number
  system: number
  nice: number
  iowait: number
  label: string
}) {
  const total = user + system + nice + iowait

  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="w-4 text-gray-400">{label}</span>
      <div className="flex-1 h-2 bg-gray-800 rounded-sm overflow-hidden flex">
        <div
          className="h-full bg-green-500"
          style={{ width: `${user}%` }}
          title={`User: ${user.toFixed(1)}%`}
        />
        <div
          className="h-full bg-red-500"
          style={{ width: `${system}%` }}
          title={`System: ${system.toFixed(1)}%`}
        />
        <div
          className="h-full bg-cyan-500"
          style={{ width: `${nice}%` }}
          title={`Nice: ${nice.toFixed(1)}%`}
        />
        <div
          className="h-full bg-yellow-600"
          style={{ width: `${iowait}%` }}
          title={`IO Wait: ${iowait.toFixed(1)}%`}
        />
      </div>
      <span className="w-12 text-right text-gray-400">{total.toFixed(0)}%</span>
    </div>
  )
}

export function CpuMeter({ meter, cpuCount = 8 }: CpuMeterProps) {
  const isAllCpus = meter.type === 'AllCPUs'
  const cpuData = getMockCpuData(isAllCpus ? cpuCount : 1)

  if (meter.mode === 'text') {
    const avgUser = cpuData.reduce((sum, cpu) => sum + cpu.user, 0) / cpuData.length
    const avgSystem = cpuData.reduce((sum, cpu) => sum + cpu.system, 0) / cpuData.length
    return (
      <div className="text-xs">
        <span className="text-gray-400">CPU: </span>
        <span className="text-green-400">{avgUser.toFixed(1)}%</span>
        <span className="text-gray-500"> user, </span>
        <span className="text-red-400">{avgSystem.toFixed(1)}%</span>
        <span className="text-gray-500"> sys</span>
      </div>
    )
  }

  if (meter.mode === 'graph') {
    // Simple ASCII-style graph
    const bars = '▁▂▃▄▅▆▇█'
    return (
      <div className="text-xs flex items-center gap-1">
        <span className="text-gray-400">CPU</span>
        <span className="tracking-tighter">
          {cpuData.map((cpu, i) => {
            const total = cpu.user + cpu.system + cpu.nice + cpu.iowait
            const barIndex = Math.min(Math.floor(total / 12.5), 7)
            return (
              <span key={i} className="text-green-400">
                {bars[barIndex]}
              </span>
            )
          })}
        </span>
      </div>
    )
  }

  // Default: bar mode
  if (isAllCpus) {
    return (
      <div className="space-y-0.5">
        {cpuData.map((cpu, i) => (
          <CpuBarSegment
            key={i}
            user={cpu.user}
            system={cpu.system}
            nice={cpu.nice}
            iowait={cpu.iowait}
            label={`${i}`}
          />
        ))}
      </div>
    )
  }

  // Single CPU meter
  const cpu = cpuData[0]!
  return (
    <CpuBarSegment
      user={cpu.user}
      system={cpu.system}
      nice={cpu.nice}
      iowait={cpu.iowait}
      label="CPU"
    />
  )
}
