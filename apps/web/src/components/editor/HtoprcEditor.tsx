import { useEffect, useRef, useCallback } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine, hoverTooltip, Tooltip } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { oneDark } from '@codemirror/theme-one-dark'
import { StreamLanguage } from '@codemirror/language'
import { autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { HTOPRC_OPTIONS, METER_TYPES, OPTION_MAP } from './htoprcOptions'

interface HtoprcEditorProps {
  value: string
  onChange: (value: string) => void
}

function htoprcHoverTooltip(view: EditorView, pos: number): Tooltip | null {
  const line = view.state.doc.lineAt(pos)
  const lineText = line.text

  // Find option name at the start of line
  const match = lineText.match(/^([a-z_][a-z0-9_]*)\s*=/i)
  if (!match) return null

  const optionName = match[1]
  const option = OPTION_MAP.get(optionName)
  if (!option) return null

  // Check if cursor is on the option name
  const optionStart = line.from
  const optionEnd = line.from + optionName.length
  if (pos < optionStart || pos > optionEnd) return null

  return {
    pos: optionStart,
    end: optionEnd,
    above: true,
    create() {
      const dom = document.createElement('div')
      dom.className = 'cm-tooltip-htoprc'
      dom.innerHTML = `
        <div style="padding: 8px 12px; max-width: 400px;">
          <div style="font-weight: bold; color: #61afef; margin-bottom: 4px;">${option.name}</div>
          <div style="color: #abb2bf; font-size: 13px;">${option.description}</div>
          ${option.values ? `<div style="color: #98c379; font-size: 12px; margin-top: 6px;">Values: ${option.values.join(', ')}</div>` : ''}
          ${option.example ? `<div style="color: #98c379; font-size: 12px; margin-top: 6px;">Example: ${option.example}</div>` : ''}
        </div>
      `
      return { dom }
    },
  }
}

function htoprcCompletions(context: CompletionContext): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos)
  const lineText = line.text.slice(0, context.pos - line.from)

  // Check if we're in a comment
  if (lineText.trimStart().startsWith('#')) {
    return null
  }

  // Check if we're after an = sign (suggesting values)
  const equalMatch = lineText.match(/^([a-z_][a-z0-9_]*)=(.*)$/i)
  if (equalMatch) {
    const optionName = equalMatch[1]
    const currentValue = equalMatch[2]
    const option = OPTION_MAP.get(optionName)

    // For meter columns, suggest meter types
    if (optionName.startsWith('column_meters_')) {
      const lastWord = currentValue.split(/\s+/).pop() || ''
      const from = context.pos - lastWord.length
      return {
        from,
        options: METER_TYPES.filter((m) => m.toLowerCase().startsWith(lastWord.toLowerCase())).map((m) => ({
          label: m,
          type: 'constant',
          detail: 'meter type',
        })),
      }
    }

    // For options with predefined values
    if (option?.values) {
      const from = context.pos - currentValue.length
      return {
        from,
        options: option.values.map((v) => ({
          label: v,
          type: 'value',
          detail: option.type === 'boolean' ? (v === '1' ? 'enabled' : 'disabled') : undefined,
        })),
      }
    }

    return null
  }

  // Suggest option names at start of line
  const wordMatch = lineText.match(/^([a-z_][a-z0-9_]*)?$/i)
  if (wordMatch) {
    const prefix = wordMatch[1] || ''
    const from = context.pos - prefix.length
    return {
      from,
      options: HTOPRC_OPTIONS.filter((opt) => opt.name.toLowerCase().startsWith(prefix.toLowerCase())).map((opt) => ({
        label: opt.name,
        type: 'property',
        detail: opt.type,
        info: opt.description,
        apply: opt.name + '=',
      })),
    }
  }

  return null
}

// Simple htoprc syntax highlighting
const htoprcLanguage = StreamLanguage.define({
  token(stream) {
    // Comments
    if (stream.match(/^#.*/)) {
      return 'comment'
    }
    // Option names (before =)
    if (stream.match(/^[a-z_][a-z0-9_]*/i)) {
      if (stream.peek() === '=') {
        return 'keyword'
      }
      return 'string'
    }
    // Values after =
    if (stream.eat('=')) {
      return 'operator'
    }
    // Numbers
    if (stream.match(/^-?\d+(\.\d+)?/)) {
      return 'number'
    }
    // Skip whitespace
    if (stream.eatSpace()) {
      return null
    }
    // Everything else
    stream.next()
    return null
  },
})

export function HtoprcEditor({ value, onChange }: HtoprcEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue)
    },
    [onChange]
  )

  useEffect(() => {
    if (!editorRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        handleChange(update.state.doc.toString())
      }
    })

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        htoprcLanguage,
        autocompletion({
          override: [htoprcCompletions],
          activateOnTyping: true,
        }),
        hoverTooltip(htoprcHoverTooltip),
        oneDark,
        updateListener,
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '14px',
          },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          },
          '.cm-content': {
            minHeight: '200px',
          },
        }),
      ],
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
  }, [])

  // Update content when value prop changes externally
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentContent = view.state.doc.toString()
    if (currentContent !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: value,
        },
      })
    }
  }, [value])

  return (
    <div
      ref={editorRef}
      data-testid="htoprc-editor"
      className="cm-theme h-full rounded-lg overflow-hidden border border-gray-700 focus-within:border-blue-500"
    />
  )
}
