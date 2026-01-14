import type { HtopConfig } from '@htoprc/parser'

interface Process {
  pid: number
  ppid: number
  user: string
  cpu: number
  mem: number
  time: string
  command: string
}

// Mock process data in tree structure (parent-child relationships)
const MOCK_PROCESSES: Process[] = [
  { pid: 1, ppid: 0, user: 'root', cpu: 0.0, mem: 0.1, time: '0:03.21', command: '/sbin/init' },
  { pid: 345, ppid: 1, user: 'root', cpu: 0.1, mem: 0.3, time: '0:01.05', command: '/usr/lib/systemd/systemd-journald' },
  { pid: 456, ppid: 1, user: 'root', cpu: 0.3, mem: 0.5, time: '0:01.23', command: '/usr/bin/dbus-daemon --system' },
  { pid: 567, ppid: 1, user: 'root', cpu: 0.0, mem: 0.2, time: '0:00.45', command: '/usr/lib/systemd/systemd-logind' },
  { pid: 1234, ppid: 1, user: 'dev', cpu: 12.5, mem: 2.4, time: '1:23.45', command: 'node /usr/local/bin/vite' },
  { pid: 1235, ppid: 1234, user: 'dev', cpu: 3.2, mem: 1.1, time: '0:15.23', command: 'esbuild --service' },
  { pid: 2345, ppid: 1, user: 'dev', cpu: 8.2, mem: 5.1, time: '0:45.12', command: '/usr/share/code/code --type=utility' },
  { pid: 2346, ppid: 2345, user: 'dev', cpu: 4.5, mem: 3.2, time: '0:22.34', command: '/usr/share/code/code --type=renderer' },
  { pid: 2347, ppid: 2345, user: 'dev', cpu: 2.1, mem: 1.8, time: '0:12.45', command: '/usr/share/code/code --type=extension-host' },
  { pid: 4567, ppid: 1, user: 'dev', cpu: 45.3, mem: 8.7, time: '2:34.56', command: '/usr/lib/chromium/chromium' },
  { pid: 4568, ppid: 4567, user: 'dev', cpu: 12.3, mem: 2.4, time: '0:45.12', command: '/usr/lib/chromium/chromium --type=gpu-process' },
  { pid: 4569, ppid: 4567, user: 'dev', cpu: 8.7, mem: 3.1, time: '0:32.23', command: '/usr/lib/chromium/chromium --type=renderer' },
  { pid: 4570, ppid: 4567, user: 'dev', cpu: 5.2, mem: 2.8, time: '0:21.45', command: '/usr/lib/chromium/chromium --type=renderer' },
  { pid: 5678, ppid: 1, user: 'dev', cpu: 1.5, mem: 3.2, time: '0:08.90', command: 'htop' },
  { pid: 7890, ppid: 1, user: 'dev', cpu: 3.7, mem: 4.1, time: '0:15.67', command: '/usr/share/spotify/spotify' },
]

// Unicode box-drawing characters for tree view
const TREE_CHARS = {
  vertical: '│',     // Continuing line
  branch: '├',       // Branch to child (more siblings after)
  corner: '└',       // Last child
  horizontal: '─',   // Horizontal connection
}

interface TreeProcess extends Process {
  depth: number
  isLastChild: boolean
  parentChain: boolean[] // Which parents have more siblings
}

function buildProcessTree(processes: Process[], treeView: boolean): TreeProcess[] {
  if (!treeView) {
    // Flat view - just return with no tree info
    return processes.map((p) => ({
      ...p,
      depth: 0,
      isLastChild: false,
      parentChain: [],
    }))
  }

  // Build a map of pid -> process
  const processMap = new Map<number, Process>()
  const childrenMap = new Map<number, Process[]>()

  for (const proc of processes) {
    processMap.set(proc.pid, proc)
    if (!childrenMap.has(proc.ppid)) {
      childrenMap.set(proc.ppid, [])
    }
    childrenMap.get(proc.ppid)!.push(proc)
  }

  // Recursive tree builder
  const result: TreeProcess[] = []

  function addToTree(pid: number, depth: number, parentChain: boolean[]) {
    const proc = processMap.get(pid)
    if (!proc) return

    const children = childrenMap.get(pid) ?? []
    const siblings = childrenMap.get(proc.ppid) ?? []
    const isLastChild = siblings.indexOf(proc) === siblings.length - 1

    result.push({
      ...proc,
      depth,
      isLastChild,
      parentChain: [...parentChain],
    })

    // Add children
    for (let i = 0; i < children.length; i++) {
      const isLast = i === children.length - 1
      addToTree(children[i]!.pid, depth + 1, [...parentChain, !isLast])
    }
  }

  // Start with root processes (ppid=0 or ppid not in our list)
  const rootProcesses = processes.filter(
    (p) => p.ppid === 0 || !processMap.has(p.ppid)
  )

  for (let i = 0; i < rootProcesses.length; i++) {
    addToTree(rootProcesses[i]!.pid, 0, [])
  }

  return result
}

function getTreePrefix(proc: TreeProcess): string {
  if (proc.depth === 0) return ''

  let prefix = ''

  // Add vertical lines for parent chains
  for (let i = 0; i < proc.parentChain.length - 1; i++) {
    prefix += proc.parentChain[i] ? `${TREE_CHARS.vertical}  ` : '   '
  }

  // Add branch or corner for this level
  if (proc.depth > 0) {
    prefix += proc.isLastChild
      ? `${TREE_CHARS.corner}${TREE_CHARS.horizontal} `
      : `${TREE_CHARS.branch}${TREE_CHARS.horizontal} `
  }

  return prefix
}

interface ProcessListProps {
  config: HtopConfig
}

export function ProcessList({ config }: ProcessListProps) {
  const processes = buildProcessTree(MOCK_PROCESSES, config.treeView)

  return (
    <div className="font-mono text-xs">
      {/* Header row */}
      <div
        className="flex font-bold"
        style={{ backgroundColor: 'var(--htop-header)', color: 'white' }}
      >
        <div className="px-1 py-0.5 w-[60px]">PID</div>
        <div className="px-1 py-0.5 w-[70px]">USER</div>
        <div className="px-1 py-0.5 w-[50px] text-right">CPU%</div>
        <div className="px-1 py-0.5 w-[50px] text-right">MEM%</div>
        <div className="px-1 py-0.5 w-[80px]">TIME+</div>
        <div className="px-1 py-0.5 flex-1">Command</div>
      </div>

      {/* Process rows */}
      {processes.map((proc, i) => (
        <div
          key={proc.pid}
          className="flex hover:opacity-80"
          style={{
            backgroundColor: i % 2 === 1 ? 'rgba(128,128,128,0.1)' : 'transparent',
            color: 'var(--htop-fg)',
          }}
        >
          <div
            className="px-1 py-0.5 w-[60px]"
            style={{ color: 'var(--htop-pid)' }}
          >
            {proc.pid}
          </div>
          <div
            className="px-1 py-0.5 w-[70px] truncate"
            style={{ color: 'var(--htop-user)' }}
          >
            {proc.user}
          </div>
          <div
            className="px-1 py-0.5 w-[50px] text-right"
            style={{ color: proc.cpu > 20 ? '#ff5555' : 'var(--htop-cpu)' }}
          >
            {proc.cpu.toFixed(1)}
          </div>
          <div
            className="px-1 py-0.5 w-[50px] text-right"
            style={{ color: 'var(--htop-mem)' }}
          >
            {proc.mem.toFixed(1)}
          </div>
          <div
            className="px-1 py-0.5 w-[80px]"
            style={{ color: 'var(--htop-time)' }}
          >
            {proc.time}
          </div>
          <div className="px-1 py-0.5 flex-1 truncate">
            <CommandCell
              command={proc.command}
              treePrefix={getTreePrefix(proc)}
              highlightBaseName={config.highlightBaseName}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

interface CommandCellProps {
  command: string
  treePrefix: string
  highlightBaseName: boolean
}

function CommandCell({ command, treePrefix, highlightBaseName }: CommandCellProps) {
  const parts = command.split(' ')
  const executable = parts[0] ?? ''
  const args = parts.slice(1).join(' ')

  const pathParts = executable.split('/')
  const baseName = pathParts.pop() ?? ''
  const path = pathParts.length > 0 ? pathParts.join('/') + '/' : ''

  return (
    <>
      {treePrefix && (
        <span className="text-gray-600">{treePrefix}</span>
      )}
      {highlightBaseName ? (
        <>
          <span style={{ color: 'var(--htop-command)' }}>{path}</span>
          <span className="font-bold" style={{ color: '#ffffff' }}>
            {baseName}
          </span>
          {args && <span style={{ color: 'var(--htop-command)' }}> {args}</span>}
        </>
      ) : (
        <span style={{ color: 'var(--htop-command)' }}>{command}</span>
      )}
    </>
  )
}
