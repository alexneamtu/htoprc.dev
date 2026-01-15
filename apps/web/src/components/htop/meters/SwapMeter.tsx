import type { Meter } from '@htoprc/parser'
import { secureRandom } from '../../../utils/random'

interface SwapMeterProps {
  meter: Meter
  totalGb?: number
}

function formatSize(gb: number): string {
  if (gb >= 1) return `${gb.toFixed(2)}G`
  return `${(gb * 1024).toFixed(0)}M`
}

export function SwapMeter({ meter, totalGb = 4 }: SwapMeterProps) {
  // Usually swap is mostly unused (0-10%)
  const used = totalGb * (secureRandom() * 0.1)

  if (meter.mode === 'text') {
    return (
      <div className="text-xs font-mono">
        <span className="text-gray-400">Swp: </span>
        <span className="text-red-400">{formatSize(used)}</span>
        <span className="text-gray-500">/</span>
        <span className="text-gray-400">{formatSize(totalGb)}</span>
      </div>
    )
  }

  if (meter.mode === 'graph') {
    const bars = '▁▂▃▄▅▆▇█'
    const graphHistory = Array.from({ length: 20 }, () =>
      (secureRandom() * 0.1) * 100
    )
    return (
      <div className="text-xs font-mono flex items-center">
        <span className="text-gray-400">Swp</span>
        <span className="text-cyan-400">[</span>
        <span className="tracking-tight">
          {graphHistory.map((val, i) => {
            const barIndex = Math.min(Math.floor(val / 12.5), 7)
            return (
              <span key={i} className="text-red-400">
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
  const usedWidth = Math.round((used / totalGb) * barWidth)
  const emptyWidth = barWidth - usedWidth

  return (
    <div className="flex items-center text-xs font-mono whitespace-nowrap">
      <span className="text-gray-400">Swp</span>
      <span className="text-cyan-400">[</span>
      <span className="text-red-400">{'|'.repeat(Math.max(0, usedWidth))}</span>
      <span>{' '.repeat(Math.max(0, emptyWidth))}</span>
      <span className="text-cyan-400">]</span>
      <span className="text-gray-300 ml-1">
        {formatSize(used)}/{formatSize(totalGb)}
      </span>
    </div>
  )
}
