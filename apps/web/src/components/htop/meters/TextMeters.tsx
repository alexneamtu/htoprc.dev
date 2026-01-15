import type { Meter } from '@htoprc/parser'

interface TextMeterProps {
  meter: Meter
}

export function TasksMeter({ meter }: TextMeterProps) {
  const running = Math.floor(Math.random() * 5) + 1
  const total = Math.floor(Math.random() * 200) + 100
  const threads = total + Math.floor(Math.random() * 300)

  if (meter.mode === 'bar') {
    return (
      <div className="text-xs font-mono">
        <span className="text-gray-400">Tasks: </span>
        <span className="text-green-400">{running}</span>
        <span className="text-gray-400">, {total} total</span>
        <span className="text-gray-500">; {threads} thr</span>
      </div>
    )
  }

  return (
    <div className="text-xs font-mono">
      <span className="text-gray-400">Tasks: </span>
      <span className="text-green-400">{running}</span>
      <span className="text-gray-500">, </span>
      <span className="text-gray-400">{total} total</span>
    </div>
  )
}

export function LoadAverageMeter({ meter }: TextMeterProps) {
  const load1 = (3 + Math.random() * 3).toFixed(2)
  const load5 = (2.5 + Math.random() * 2.5).toFixed(2)
  const load15 = (2 + Math.random() * 2).toFixed(2)

  if (meter.mode === 'bar') {
    return (
      <div className="text-xs font-mono flex items-center">
        <span className="text-gray-400">Load average: </span>
        <span className="text-cyan-400">{load1} {load5} {load15}</span>
      </div>
    )
  }

  return (
    <div className="text-xs font-mono">
      <span className="text-gray-400">Load average: </span>
      <span className="text-cyan-400">{load1} {load5} {load15}</span>
    </div>
  )
}

export function UptimeMeter({ meter }: TextMeterProps) {
  const days = Math.floor(Math.random() * 30)
  const hours = Math.floor(Math.random() * 24)
  const mins = Math.floor(Math.random() * 60)

  const uptimeStr =
    days > 0
      ? `${days} days, ${hours}:${mins.toString().padStart(2, '0')}`
      : `${hours}:${mins.toString().padStart(2, '0')}`

  if (meter.mode === 'bar') {
    return (
      <div className="flex items-center gap-1 text-xs">
        <span className="w-12 text-gray-400">Uptime:</span>
        <span className="text-yellow-400">{uptimeStr}</span>
      </div>
    )
  }

  return (
    <div className="text-xs">
      <span className="text-gray-400">Uptime: </span>
      <span className="text-yellow-400">{uptimeStr}</span>
    </div>
  )
}

export function ClockMeter({ meter }: TextMeterProps) {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false })

  if (meter.mode === 'bar') {
    return (
      <div className="flex items-center gap-1 text-xs">
        <span className="w-10 text-gray-400">Time:</span>
        <span className="text-white">{timeStr}</span>
      </div>
    )
  }

  return (
    <div className="text-xs">
      <span className="text-white">{timeStr}</span>
    </div>
  )
}

export function HostnameMeter({ meter }: TextMeterProps) {
  const hostname = 'dev-workstation'

  if (meter.mode === 'bar') {
    return (
      <div className="flex items-center gap-1 text-xs">
        <span className="w-12 text-gray-400">Host:</span>
        <span className="text-cyan-400">{hostname}</span>
      </div>
    )
  }

  return (
    <div className="text-xs">
      <span className="text-cyan-400">{hostname}</span>
    </div>
  )
}

export function DiskIOMeter({ meter }: TextMeterProps) {
  const readKb = Math.floor(Math.random() * 5000)
  const writeKb = Math.floor(Math.random() * 2000)

  const formatRate = (kb: number) => {
    if (kb >= 1024) return `${(kb / 1024).toFixed(1)}M`
    return `${kb}K`
  }

  if (meter.mode === 'graph') {
    const bars = '▁▂▃▄▅▆▇█'
    const graphHistory = Array.from({ length: 15 }, () => Math.random() * 100)
    return (
      <div className="text-xs font-mono flex items-center">
        <span className="text-gray-400">Dis</span>
        <span className="text-cyan-400">[</span>
        <span className="tracking-tight">
          {graphHistory.map((val, i) => {
            const barIndex = Math.min(Math.floor(val / 12.5), 7)
            return (
              <span key={i} className="text-cyan-400">
                {bars[barIndex]}
              </span>
            )
          })}
        </span>
        <span className="text-cyan-400">]</span>
      </div>
    )
  }

  if (meter.mode === 'bar') {
    const barWidth = 20
    const readPercent = Math.min(readKb / 5000, 1) * barWidth
    const writePercent = Math.min(writeKb / 5000, 1) * barWidth

    return (
      <div className="text-xs font-mono flex items-center">
        <span className="text-gray-400">Disk IO</span>
        <span className="text-cyan-400">[</span>
        <span className="text-green-400">{'|'.repeat(Math.floor(readPercent))}</span>
        <span className="text-red-400">{'|'.repeat(Math.floor(writePercent))}</span>
        <span>{' '.repeat(Math.max(0, barWidth - Math.floor(readPercent) - Math.floor(writePercent)))}</span>
        <span className="text-cyan-400">]</span>
        <span className="ml-1 text-green-400">{formatRate(readKb)}</span>
        <span className="text-gray-500">/</span>
        <span className="text-red-400">{formatRate(writeKb)}</span>
      </div>
    )
  }

  return (
    <div className="text-xs font-mono">
      <span className="text-gray-400">IO: </span>
      <span className="text-green-400">R:{formatRate(readKb)}</span>
      <span className="text-gray-500">/</span>
      <span className="text-red-400">W:{formatRate(writeKb)}</span>
    </div>
  )
}

export function NetworkIOMeter({ meter }: TextMeterProps) {
  const rxKb = Math.floor(Math.random() * 100)
  const txKb = Math.floor(Math.random() * 50)

  const formatRate = (kb: number) => {
    if (kb >= 1024) return `${(kb / 1024).toFixed(1)}M`
    return `${kb}K`
  }

  if (meter.mode === 'graph') {
    const bars = '▁▂▃▄▅▆▇█'
    const graphHistory = Array.from({ length: 15 }, () => Math.random() * 60)
    return (
      <div className="text-xs font-mono flex items-center">
        <span className="text-gray-400">Net</span>
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

  if (meter.mode === 'bar') {
    const barWidth = 20
    const rxPercent = Math.min(rxKb / 1000, 1) * barWidth
    const txPercent = Math.min(txKb / 1000, 1) * barWidth

    return (
      <div className="text-xs font-mono flex items-center">
        <span className="text-gray-400">Network IO</span>
        <span className="text-cyan-400">[</span>
        <span className="text-green-400">{'|'.repeat(Math.floor(rxPercent))}</span>
        <span className="text-yellow-400">{'|'.repeat(Math.floor(txPercent))}</span>
        <span>{' '.repeat(Math.max(0, barWidth - Math.floor(rxPercent) - Math.floor(txPercent)))}</span>
        <span className="text-cyan-400">]</span>
        <span className="ml-1 text-green-400">↓{formatRate(rxKb)}</span>
        <span className="text-gray-500">/</span>
        <span className="text-yellow-400">↑{formatRate(txKb)}</span>
      </div>
    )
  }

  return (
    <div className="text-xs font-mono">
      <span className="text-gray-400">Net: </span>
      <span className="text-green-400">↓{formatRate(rxKb)}</span>
      <span className="text-gray-500"> </span>
      <span className="text-yellow-400">↑{formatRate(txKb)}</span>
    </div>
  )
}

export function PressureMeter({ meter }: TextMeterProps) {
  // Pressure Stall Information - often disabled on systems
  const isAvailable = Math.random() > 0.5

  if (!isAvailable) {
    return (
      <div className="text-xs font-mono">
        <span className="text-gray-400">Dis</span>
      </div>
    )
  }

  const someAvg = (Math.random() * 30).toFixed(2)

  if (meter.mode === 'bar') {
    const barWidth = 20
    const filled = Math.round((parseFloat(someAvg) / 100) * barWidth)
    return (
      <div className="text-xs font-mono flex items-center">
        <span className="text-gray-400">Pressure</span>
        <span className="text-cyan-400">[</span>
        <span className="text-magenta-400">{'|'.repeat(filled)}</span>
        <span>{' '.repeat(barWidth - filled)}</span>
        <span className="text-cyan-400">]</span>
        <span className="ml-1 text-gray-300">{someAvg}%</span>
      </div>
    )
  }

  return (
    <div className="text-xs font-mono">
      <span className="text-gray-400">Pressure: </span>
      <span className="text-purple-400">{someAvg}%</span>
    </div>
  )
}

export function ZramMeter({ meter }: TextMeterProps) {
  const usedMb = Math.floor(Math.random() * 500)
  const totalMb = 2048
  const percent = (usedMb / totalMb) * 100

  if (meter.mode === 'bar') {
    const barWidth = 25
    const filled = Math.round((percent / 100) * barWidth)
    return (
      <div className="text-xs font-mono flex items-center">
        <span className="text-gray-400">zrm</span>
        <span className="text-cyan-400">[</span>
        <span className="text-yellow-400">{'|'.repeat(filled)}</span>
        <span>{' '.repeat(barWidth - filled)}</span>
        <span className="text-cyan-400">]</span>
        <span className="ml-1 text-gray-300">{usedMb}M/{totalMb}M</span>
      </div>
    )
  }

  return (
    <div className="text-xs font-mono">
      <span className="text-gray-400">Zram: </span>
      <span className="text-yellow-400">{usedMb}M</span>
      <span className="text-gray-500">/{totalMb}M</span>
    </div>
  )
}

export function BlankMeter() {
  // Blank meter is just an empty space for visual separation
  return <div className="h-4" />
}
