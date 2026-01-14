import type { Meter } from '@htoprc/parser'

interface MemoryMeterProps {
  meter: Meter
  totalGb?: number
}

// Mock memory data
function getMockMemoryData(totalGb: number) {
  const used = totalGb * (0.3 + Math.random() * 0.3)
  const buffers = totalGb * (0.02 + Math.random() * 0.03)
  const cache = totalGb * (0.1 + Math.random() * 0.15)
  return { used, buffers, cache, total: totalGb }
}

export function MemoryMeter({ meter, totalGb = 16 }: MemoryMeterProps) {
  const mem = getMockMemoryData(totalGb)

  if (meter.mode === 'text') {
    return (
      <div className="text-xs">
        <span className="text-gray-400">Mem: </span>
        <span className="text-green-400">{mem.used.toFixed(1)}G</span>
        <span className="text-gray-500">/</span>
        <span className="text-gray-400">{mem.total.toFixed(0)}G</span>
      </div>
    )
  }

  if (meter.mode === 'graph') {
    const bars = '▁▂▃▄▅▆▇█'
    const percent = ((mem.used + mem.buffers + mem.cache) / mem.total) * 100
    const barIndex = Math.min(Math.floor(percent / 12.5), 7)
    return (
      <div className="text-xs flex items-center gap-1">
        <span className="text-gray-400">Mem</span>
        <span className="text-green-400">{bars[barIndex]}</span>
        <span className="text-gray-500">{percent.toFixed(0)}%</span>
      </div>
    )
  }

  // Default: bar mode
  const usedPercent = (mem.used / mem.total) * 100
  const buffersPercent = (mem.buffers / mem.total) * 100
  const cachePercent = (mem.cache / mem.total) * 100

  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="w-8 text-gray-400">Mem</span>
      <div className="flex-1 h-2 bg-gray-800 rounded-sm overflow-hidden flex">
        <div
          className="h-full bg-green-500"
          style={{ width: `${usedPercent}%` }}
          title={`Used: ${mem.used.toFixed(1)}G`}
        />
        <div
          className="h-full bg-blue-500"
          style={{ width: `${buffersPercent}%` }}
          title={`Buffers: ${mem.buffers.toFixed(2)}G`}
        />
        <div
          className="h-full bg-yellow-500"
          style={{ width: `${cachePercent}%` }}
          title={`Cache: ${mem.cache.toFixed(1)}G`}
        />
      </div>
      <span className="w-16 text-right text-gray-400">
        {mem.used.toFixed(1)}G/{mem.total}G
      </span>
    </div>
  )
}
