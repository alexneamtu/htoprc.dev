import type { HtopConfig, Meter } from '@htoprc/parser'
import { COLOR_SCHEMES } from './ColorSchemes'
import { MeterRenderer } from './meters'
import { ProcessList } from './ProcessList'

interface HtopPreviewProps {
  config: HtopConfig
}

function HeaderMeters({ meters, side }: { meters: Meter[]; side: 'left' | 'right' }) {
  return (
    <div className={`flex-1 space-y-1 ${side === 'right' ? 'pl-2' : 'pr-2'}`}>
      {meters.map((meter, i) => (
        <MeterRenderer key={i} meter={meter} />
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
    <div className="flex text-xs">
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
        style={{ color: 'var(--htop-fg)' }}
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
