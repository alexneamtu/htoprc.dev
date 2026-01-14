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
      <div className="flex items-center gap-1 text-xs">
        <span className="w-10 text-gray-400">Tasks:</span>
        <span className="text-green-400">{running}</span>
        <span className="text-gray-500">,</span>
        <span className="text-gray-400">{total}</span>
        <span className="text-gray-500"> thr;</span>
        <span className="text-gray-400">{threads}</span>
      </div>
    )
  }

  return (
    <div className="text-xs">
      <span className="text-gray-400">Tasks: </span>
      <span className="text-green-400">{running}</span>
      <span className="text-gray-500">, </span>
      <span className="text-gray-400">{total} total</span>
    </div>
  )
}

export function LoadAverageMeter({ meter }: TextMeterProps) {
  const load1 = (Math.random() * 3).toFixed(2)
  const load5 = (Math.random() * 2.5).toFixed(2)
  const load15 = (Math.random() * 2).toFixed(2)

  if (meter.mode === 'bar') {
    const loadPercent = (parseFloat(load1) / 8) * 100 // Assume 8 cores
    return (
      <div className="flex items-center gap-1 text-xs">
        <span className="w-10 text-gray-400">Load:</span>
        <div className="flex-1 h-2 bg-gray-800 rounded-sm overflow-hidden">
          <div
            className="h-full bg-cyan-500"
            style={{ width: `${Math.min(loadPercent, 100)}%` }}
          />
        </div>
        <span className="text-cyan-400">{load1}</span>
        <span className="text-gray-500">/</span>
        <span className="text-cyan-400">{load5}</span>
        <span className="text-gray-500">/</span>
        <span className="text-cyan-400">{load15}</span>
      </div>
    )
  }

  return (
    <div className="text-xs">
      <span className="text-gray-400">Load: </span>
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
  const readMb = (Math.random() * 100).toFixed(1)
  const writeMb = (Math.random() * 50).toFixed(1)

  if (meter.mode === 'bar') {
    return (
      <div className="flex items-center gap-1 text-xs">
        <span className="w-10 text-gray-400">Disk:</span>
        <span className="text-green-400">R:{readMb}M</span>
        <span className="text-gray-500">/</span>
        <span className="text-red-400">W:{writeMb}M</span>
      </div>
    )
  }

  return (
    <div className="text-xs">
      <span className="text-gray-400">IO: </span>
      <span className="text-green-400">{readMb}M</span>
      <span className="text-gray-500">/</span>
      <span className="text-red-400">{writeMb}M</span>
    </div>
  )
}

export function NetworkIOMeter({ meter }: TextMeterProps) {
  const rxKb = (Math.random() * 1000).toFixed(0)
  const txKb = (Math.random() * 500).toFixed(0)

  if (meter.mode === 'bar') {
    return (
      <div className="flex items-center gap-1 text-xs">
        <span className="w-10 text-gray-400">Net:</span>
        <span className="text-green-400">↓{rxKb}K</span>
        <span className="text-gray-500">/</span>
        <span className="text-yellow-400">↑{txKb}K</span>
      </div>
    )
  }

  return (
    <div className="text-xs">
      <span className="text-gray-400">Net: </span>
      <span className="text-green-400">↓{rxKb}K</span>
      <span className="text-gray-500"> </span>
      <span className="text-yellow-400">↑{txKb}K</span>
    </div>
  )
}
