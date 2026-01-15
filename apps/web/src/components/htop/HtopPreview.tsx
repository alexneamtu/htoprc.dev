import { useState } from 'react'
import type { HtopConfig, Meter } from '@htoprc/parser'
import { MeterRenderer } from './meters'
import { ProcessList } from './ProcessList'

interface HtopPreviewProps {
  config: HtopConfig
  compact?: boolean
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

const htopStyles = {
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

function FullPreview({ config }: { config: HtopConfig }) {
  return (
    <div
      className="font-mono text-sm rounded overflow-hidden border border-gray-700"
      style={htopStyles}
    >
      {/* Header with meters */}
      <div className="flex p-2" style={{ color: 'var(--htop-fg)' }}>
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

function CompactPreview({ config, onExpand }: { config: HtopConfig; onExpand: () => void }) {
  // Show only meters in a compact layout
  const allMeters = [...config.leftMeters, ...config.rightMeters].slice(0, 4)

  return (
    <button
      onClick={onExpand}
      className="w-full text-left font-mono text-xs rounded overflow-hidden border border-gray-700 cursor-pointer hover:border-blue-500 transition-colors"
      style={htopStyles}
    >
      <div className="p-2 space-y-1">
        {allMeters.map((meter, i) => (
          <MeterRenderer key={i} meter={meter} />
        ))}
      </div>
      <div className="text-center py-1 text-[10px] text-gray-500 bg-gray-900/50">
        Tap to expand
      </div>
    </button>
  )
}

function PreviewModal({ config, onClose }: { config: HtopConfig; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex justify-end">
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <FullPreview config={config} />
      </div>
    </div>
  )
}

export function HtopPreview({ config, compact }: HtopPreviewProps) {
  const [showModal, setShowModal] = useState(false)

  // If compact mode is forced, always show compact view
  if (compact) {
    return (
      <>
        <CompactPreview config={config} onExpand={() => setShowModal(true)} />
        {showModal && <PreviewModal config={config} onClose={() => setShowModal(false)} />}
      </>
    )
  }

  // Default: full preview on larger screens, compact on mobile (handled via CSS)
  return (
    <>
      {/* Full preview for larger screens */}
      <div className="hidden sm:block">
        <FullPreview config={config} />
      </div>

      {/* Compact preview for mobile */}
      <div className="block sm:hidden">
        <CompactPreview config={config} onExpand={() => setShowModal(true)} />
        {showModal && <PreviewModal config={config} onClose={() => setShowModal(false)} />}
      </div>
    </>
  )
}
