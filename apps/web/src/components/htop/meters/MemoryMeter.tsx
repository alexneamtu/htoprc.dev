import type { Meter } from '@htoprc/parser'

interface MemoryMeterProps {
  meter: Meter
  totalGb?: number
}

// Mock memory data
function getMockMemoryData(totalGb: number) {
  const used = totalGb * (0.2 + Math.random() * 0.25)
  const buffers = totalGb * (0.02 + Math.random() * 0.03)
  const cache = totalGb * (0.1 + Math.random() * 0.15)
  return { used, buffers, cache, total: totalGb }
}

function formatSize(gb: number): string {
  if (gb >= 1) return `${gb.toFixed(2)}G`
  return `${(gb * 1024).toFixed(0)}M`
}

export function MemoryMeter({ meter, totalGb = 15.5 }: MemoryMeterProps) {
  const mem = getMockMemoryData(totalGb)

  if (meter.mode === 'text') {
    return (
      <div className="text-xs font-mono">
        <span className="text-gray-400">Mem: </span>
        <span className="text-green-400">{formatSize(mem.used)}</span>
        <span className="text-gray-500">/</span>
        <span className="text-gray-400">{formatSize(mem.total)}</span>
      </div>
    )
  }

  if (meter.mode === 'graph') {
    const bars = '▁▂▃▄▅▆▇█'
    const graphHistory = Array.from({ length: 20 }, () =>
      ((mem.used + Math.random() * 2) / mem.total) * 100
    )
    return (
      <div className="text-xs font-mono flex items-center">
        <span className="text-gray-400">Mem</span>
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

  // Default: bar mode - htop style with pipes
  const barWidth = 35
  const usedWidth = Math.round((mem.used / mem.total) * barWidth)
  const buffersWidth = Math.round((mem.buffers / mem.total) * barWidth)
  const cacheWidth = Math.round((mem.cache / mem.total) * barWidth)
  const emptyWidth = barWidth - usedWidth - buffersWidth - cacheWidth

  return (
    <div className="flex items-center text-xs font-mono whitespace-nowrap">
      <span className="text-gray-400">Mem</span>
      <span className="text-cyan-400">[</span>
      <span className="text-green-400">{'|'.repeat(Math.max(0, usedWidth))}</span>
      <span className="text-blue-400">{'|'.repeat(Math.max(0, buffersWidth))}</span>
      <span className="text-yellow-400">{'|'.repeat(Math.max(0, cacheWidth))}</span>
      <span>{' '.repeat(Math.max(0, emptyWidth))}</span>
      <span className="text-cyan-400">]</span>
      <span className="text-gray-300 ml-1">
        {formatSize(mem.used)}/{formatSize(mem.total)}
      </span>
    </div>
  )
}
