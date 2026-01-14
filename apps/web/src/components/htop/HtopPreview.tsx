import type { HtopConfig, Meter } from '@htoprc/parser'
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
  // htop uses terminal background/colors, not its own - always use dark terminal style
  // The color_scheme setting in htoprc refers to terminal color indices, not actual colors
  return (
    <div
      className="font-mono text-sm rounded overflow-hidden border border-gray-700"
      style={
        {
          // Use consistent dark terminal colors (htop uses terminal colors, not its own)
          backgroundColor: '#0d0d0d',
          color: '#aaaaaa',
          '--htop-bg': '#0d0d0d',
          '--htop-fg': '#aaaaaa',
          '--htop-header': '#005577',
          '--htop-meter-bar': '#00aa00',
          '--htop-meter-text': '#00aa00',
          '--htop-selection': '#005577',
          '--htop-pid': '#00aaaa',
          '--htop-user': '#00aa00',
          '--htop-cpu': '#00aa00',
          '--htop-mem': '#aaaa00',
          '--htop-time': '#aaaaaa',
          '--htop-command': '#aaaaaa',
          '--htop-fn-key': '#000000',
          '--htop-fn-label': '#00aaaa',
          '--htop-fn-text': '#000000',
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
