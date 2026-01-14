import type { HtopConfig, Meter } from '@htoprc/parser'
import { COLOR_SCHEMES } from './ColorSchemes'

interface HtopPreviewProps {
  config: HtopConfig
}

// Mock process data for the preview
const MOCK_PROCESSES = [
  { pid: 1, user: 'root', cpu: 0.0, mem: 0.1, time: '0:03.21', command: '/sbin/init' },
  { pid: 1234, user: 'aneamtu', cpu: 12.5, mem: 2.4, time: '1:23.45', command: 'node /usr/local/bin/vite' },
  { pid: 2345, user: 'aneamtu', cpu: 8.2, mem: 5.1, time: '0:45.12', command: 'code --type=renderer' },
  { pid: 3456, user: 'root', cpu: 2.1, mem: 1.2, time: '0:12.34', command: '/usr/lib/systemd/systemd-journald' },
  { pid: 4567, user: 'aneamtu', cpu: 45.3, mem: 8.7, time: '2:34.56', command: 'chromium --type=gpu-process' },
  { pid: 5678, user: 'aneamtu', cpu: 1.5, mem: 3.2, time: '0:08.90', command: 'htop' },
  { pid: 6789, user: 'root', cpu: 0.3, mem: 0.5, time: '0:01.23', command: '/usr/bin/dbus-daemon --system' },
  { pid: 7890, user: 'aneamtu', cpu: 3.7, mem: 4.1, time: '0:15.67', command: 'spotify --type=renderer' },
]

function MeterBar({ meter, value, max }: { meter: Meter; value: number; max: number }) {
  const percentage = (value / max) * 100

  if (meter.mode === 'text') {
    return (
      <span className="text-htop-meter-text">
        {meter.type}: {value.toFixed(1)}/{max}
      </span>
    )
  }

  if (meter.mode === 'graph') {
    // Simple graph representation
    const bars = '▁▂▃▄▅▆▇█'
    const barIndex = Math.min(Math.floor(percentage / 12.5), 7)
    return (
      <span className="text-htop-meter-graph">
        {meter.type} {bars[barIndex]}
      </span>
    )
  }

  // Default: bar mode
  return (
    <div className="flex items-center gap-1">
      <span className="text-htop-meter-label w-16 text-xs">{meter.type}</span>
      <div className="flex-1 h-3 bg-gray-800 rounded overflow-hidden">
        <div
          className="h-full bg-htop-meter-bar transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs w-12 text-right">{percentage.toFixed(0)}%</span>
    </div>
  )
}

function HeaderMeters({ meters, side }: { meters: Meter[]; side: 'left' | 'right' }) {
  // Mock values for meters
  const meterValues: Record<string, { value: number; max: number }> = {
    CPU: { value: 45, max: 100 },
    AllCPUs: { value: 32, max: 100 },
    Memory: { value: 6.2, max: 16 },
    Swap: { value: 0.5, max: 8 },
    Tasks: { value: 142, max: 300 },
    LoadAverage: { value: 1.23, max: 8 },
    Uptime: { value: 3600, max: 86400 },
  }

  return (
    <div className={`flex-1 space-y-1 ${side === 'right' ? 'pl-2' : 'pr-2'}`}>
      {meters.map((meter, i) => {
        const values = meterValues[meter.type] ?? { value: 50, max: 100 }
        return <MeterBar key={i} meter={meter} value={values.value} max={values.max} />
      })}
    </div>
  )
}

function ProcessList({ config }: { config: HtopConfig }) {
  const columns = [
    { id: 0, name: 'PID', width: 60 },
    { id: 48, name: 'USER', width: 80 },
    { id: 17, name: 'CPU%', width: 50 },
    { id: 18, name: 'MEM%', width: 50 },
    { id: 46, name: 'TIME+', width: 80 },
    { id: 1, name: 'Command', width: 'auto' },
  ]

  return (
    <div className="font-mono text-xs">
      {/* Header row */}
      <div className="flex bg-htop-header text-white font-bold">
        {columns.map((col) => (
          <div
            key={col.id}
            className="px-1 py-0.5"
            style={{ width: col.width === 'auto' ? undefined : col.width, flex: col.width === 'auto' ? 1 : undefined }}
          >
            {col.name}
          </div>
        ))}
      </div>

      {/* Process rows */}
      {MOCK_PROCESSES.map((proc, i) => (
        <div
          key={proc.pid}
          className={`flex ${i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'} hover:bg-htop-selection`}
        >
          <div className="px-1 py-0.5 w-[60px] text-htop-pid">{proc.pid}</div>
          <div className="px-1 py-0.5 w-[80px] text-htop-user">{proc.user}</div>
          <div className="px-1 py-0.5 w-[50px] text-htop-cpu">{proc.cpu.toFixed(1)}</div>
          <div className="px-1 py-0.5 w-[50px] text-htop-mem">{proc.mem.toFixed(1)}</div>
          <div className="px-1 py-0.5 w-[80px] text-htop-time">{proc.time}</div>
          <div className="px-1 py-0.5 flex-1 text-htop-command truncate">
            {config.highlightBaseName ? (
              <>
                <span className="text-htop-command-path">
                  {proc.command.split(' ')[0]?.split('/').slice(0, -1).join('/') ?? ''}/
                </span>
                <span className="text-htop-command-name font-bold">
                  {proc.command.split(' ')[0]?.split('/').pop() ?? ''}
                </span>
                <span className="text-htop-command-args">
                  {' '}{proc.command.split(' ').slice(1).join(' ')}
                </span>
              </>
            ) : (
              proc.command
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function FunctionBar() {
  const functions = [
    { key: 'F1', label: 'Help' },
    { key: 'F2', label: 'Setup' },
    { key: 'F3', label: 'Search' },
    { key: 'F4', label: 'Filter' },
    { key: 'F5', label: 'Tree' },
    { key: 'F6', label: 'SortBy' },
    { key: 'F7', label: 'Nice -' },
    { key: 'F8', label: 'Nice +' },
    { key: 'F9', label: 'Kill' },
    { key: 'F10', label: 'Quit' },
  ]

  return (
    <div className="flex bg-black text-xs">
      {functions.map((fn) => (
        <div key={fn.key} className="flex">
          <span className="bg-htop-fn-key px-1 text-black font-bold">{fn.key}</span>
          <span className="bg-htop-fn-label px-1 text-htop-fn-text">{fn.label}</span>
        </div>
      ))}
    </div>
  )
}

export function HtopPreview({ config }: HtopPreviewProps) {
  const colorScheme = COLOR_SCHEMES[config.colorScheme] ?? COLOR_SCHEMES[0]

  return (
    <div
      className="font-mono text-sm rounded overflow-hidden border border-gray-700"
      style={
        {
          '--htop-bg': colorScheme?.bg,
          '--htop-fg': colorScheme?.fg,
          '--htop-header': colorScheme?.header,
          '--htop-meter-bar': colorScheme?.meterBar,
          '--htop-meter-text': colorScheme?.meterText,
          '--htop-selection': colorScheme?.selection,
          '--htop-pid': colorScheme?.pid,
          '--htop-user': colorScheme?.user,
          '--htop-cpu': colorScheme?.cpu,
          '--htop-mem': colorScheme?.mem,
          '--htop-time': colorScheme?.time,
          '--htop-command': colorScheme?.command,
          '--htop-fn-key': colorScheme?.fnKey,
          '--htop-fn-label': colorScheme?.fnLabel,
          '--htop-fn-text': colorScheme?.fnText,
        } as React.CSSProperties
      }
    >
      {/* Header with meters */}
      <div
        className="flex p-2"
        style={{ backgroundColor: 'var(--htop-bg)', color: 'var(--htop-fg)' }}
      >
        <HeaderMeters meters={config.leftMeters} side="left" />
        <HeaderMeters meters={config.rightMeters} side="right" />
      </div>

      {/* Process list */}
      <ProcessList config={config} />

      {/* Function bar */}
      {config.hideFunctionBar === 0 && <FunctionBar />}
    </div>
  )
}
