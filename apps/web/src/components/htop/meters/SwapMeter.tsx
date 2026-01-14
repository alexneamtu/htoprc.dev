import type { Meter } from '@htoprc/parser'

interface SwapMeterProps {
  meter: Meter
  totalGb?: number
}

export function SwapMeter({ meter, totalGb = 8 }: SwapMeterProps) {
  // Usually swap is mostly unused
  const used = totalGb * (Math.random() * 0.1)

  if (meter.mode === 'text') {
    return (
      <div className="text-xs">
        <span className="text-gray-400">Swp: </span>
        <span className="text-red-400">{used.toFixed(2)}G</span>
        <span className="text-gray-500">/</span>
        <span className="text-gray-400">{totalGb}G</span>
      </div>
    )
  }

  if (meter.mode === 'graph') {
    const bars = '▁▂▃▄▅▆▇█'
    const percent = (used / totalGb) * 100
    const barIndex = Math.min(Math.floor(percent / 12.5), 7)
    return (
      <div className="text-xs flex items-center gap-1">
        <span className="text-gray-400">Swp</span>
        <span className="text-red-400">{bars[barIndex]}</span>
        <span className="text-gray-500">{percent.toFixed(0)}%</span>
      </div>
    )
  }

  // Default: bar mode
  const usedPercent = (used / totalGb) * 100

  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="w-8 text-gray-400">Swp</span>
      <div className="flex-1 h-2 bg-gray-800 rounded-sm overflow-hidden">
        <div
          className="h-full bg-red-500"
          style={{ width: `${usedPercent}%` }}
          title={`Used: ${used.toFixed(2)}G`}
        />
      </div>
      <span className="w-16 text-right text-gray-400">
        {used.toFixed(2)}G/{totalGb}G
      </span>
    </div>
  )
}
