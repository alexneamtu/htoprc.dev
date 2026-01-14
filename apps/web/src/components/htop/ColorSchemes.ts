/**
 * htop color schemes (0-6)
 * These match the built-in htop color schemes
 */
export interface ColorScheme {
  name: string
  bg: string
  fg: string
  header: string
  meterBar: string
  meterText: string
  meterGraph: string
  selection: string
  pid: string
  user: string
  cpu: string
  mem: string
  time: string
  command: string
  commandPath: string
  commandName: string
  commandArgs: string
  fnKey: string
  fnLabel: string
  fnText: string
}

export const COLOR_SCHEMES: ColorScheme[] = [
  // 0: Default
  {
    name: 'Default',
    bg: '#000000',
    fg: '#aaaaaa',
    header: '#005577',
    meterBar: '#00aa00',
    meterText: '#00aa00',
    meterGraph: '#00aa00',
    selection: '#005577',
    pid: '#00aaaa',
    user: '#00aa00',
    cpu: '#00aa00',
    mem: '#aaaa00',
    time: '#aaaaaa',
    command: '#aaaaaa',
    commandPath: '#666666',
    commandName: '#ffffff',
    commandArgs: '#aaaaaa',
    fnKey: '#000000',
    fnLabel: '#00aaaa',
    fnText: '#000000',
  },
  // 1: Monochromatic
  {
    name: 'Monochromatic',
    bg: '#000000',
    fg: '#ffffff',
    header: '#333333',
    meterBar: '#ffffff',
    meterText: '#ffffff',
    meterGraph: '#ffffff',
    selection: '#444444',
    pid: '#ffffff',
    user: '#ffffff',
    cpu: '#ffffff',
    mem: '#ffffff',
    time: '#ffffff',
    command: '#ffffff',
    commandPath: '#888888',
    commandName: '#ffffff',
    commandArgs: '#cccccc',
    fnKey: '#ffffff',
    fnLabel: '#000000',
    fnText: '#ffffff',
  },
  // 2: Black on White
  {
    name: 'Black on White',
    bg: '#ffffff',
    fg: '#000000',
    header: '#cccccc',
    meterBar: '#000000',
    meterText: '#000000',
    meterGraph: '#000000',
    selection: '#dddddd',
    pid: '#0000aa',
    user: '#00aa00',
    cpu: '#aa0000',
    mem: '#aa5500',
    time: '#000000',
    command: '#000000',
    commandPath: '#666666',
    commandName: '#000000',
    commandArgs: '#444444',
    fnKey: '#000000',
    fnLabel: '#cccccc',
    fnText: '#000000',
  },
  // 3: Light Terminal
  {
    name: 'Light Terminal',
    bg: '#ffffff',
    fg: '#000000',
    header: '#aaccff',
    meterBar: '#0066cc',
    meterText: '#0066cc',
    meterGraph: '#0066cc',
    selection: '#cceeff',
    pid: '#0066cc',
    user: '#009900',
    cpu: '#cc0000',
    mem: '#cc6600',
    time: '#666666',
    command: '#000000',
    commandPath: '#888888',
    commandName: '#000000',
    commandArgs: '#444444',
    fnKey: '#0066cc',
    fnLabel: '#ffffff',
    fnText: '#0066cc',
  },
  // 4: MC (Midnight Commander)
  {
    name: 'Midnight Commander',
    bg: '#0000aa',
    fg: '#00aaaa',
    header: '#00aaaa',
    meterBar: '#00aa00',
    meterText: '#00aaaa',
    meterGraph: '#00aa00',
    selection: '#000055',
    pid: '#ffffff',
    user: '#ffff55',
    cpu: '#55ff55',
    mem: '#ffff55',
    time: '#00aaaa',
    command: '#ffffff',
    commandPath: '#00aaaa',
    commandName: '#ffffff',
    commandArgs: '#00aaaa',
    fnKey: '#000000',
    fnLabel: '#00aaaa',
    fnText: '#000000',
  },
  // 5: Black Night
  {
    name: 'Black Night',
    bg: '#000000',
    fg: '#aa5500',
    header: '#550000',
    meterBar: '#aa0000',
    meterText: '#aa5500',
    meterGraph: '#aa0000',
    selection: '#330000',
    pid: '#ff5555',
    user: '#ffaa00',
    cpu: '#ff5555',
    mem: '#ffaa00',
    time: '#aa5500',
    command: '#ffaa00',
    commandPath: '#aa5500',
    commandName: '#ffff55',
    commandArgs: '#aa5500',
    fnKey: '#aa0000',
    fnLabel: '#000000',
    fnText: '#aa0000',
  },
  // 6: Broken Gray
  {
    name: 'Broken Gray',
    bg: '#1a1a1a',
    fg: '#999999',
    header: '#333333',
    meterBar: '#666666',
    meterText: '#999999',
    meterGraph: '#666666',
    selection: '#2a2a2a',
    pid: '#cccccc',
    user: '#aaaaaa',
    cpu: '#cccccc',
    mem: '#aaaaaa',
    time: '#888888',
    command: '#999999',
    commandPath: '#666666',
    commandName: '#cccccc',
    commandArgs: '#888888',
    fnKey: '#999999',
    fnLabel: '#333333',
    fnText: '#999999',
  },
]
