import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createContentHash,
  shouldFlagConfig,
  generateSlug,
  processScrapedConfig,
} from './github'
import type { ParseResult } from '@htoprc/parser'

const createMockParseResult = (overrides: Partial<ParseResult> = {}): ParseResult => ({
  config: {
    colorScheme: 0,
    headerLayout: 'two_50_50',
    leftMeters: [],
    rightMeters: [],
    columns: [],
    treeView: false,
    hideKernelThreads: false,
    hideUserlandThreads: false,
    shadowOtherUsers: false,
    showThreadNames: false,
    showProgramPath: true,
    highlightBaseName: false,
    highlightDeletedExe: false,
    highlightMegabytes: false,
    highlightThreads: true,
    highlightChanges: false,
    highlightChangesDelaySecs: 5,
    findCommInCmdline: false,
    stripExeFromCmdline: false,
    showMergedCommand: false,
    updateProcessNames: false,
    accountGuestInCpuMeter: false,
    enableMouse: true,
    delay: 15,
    hideFunctionBar: 0,
    headerMargin: true,
    sortKey: 0,
    sortDirection: 'desc',
    treeSortKey: 0,
    treeSortDirection: 'asc',
    treeViewAlwaysByPid: false,
    allBranchesCollapsed: false,
    screenTabs: false,
    detailedCpuTime: false,
    cpuCountFromOne: false,
    showCpuUsage: false,
    showCpuFrequency: false,
    showCpuTemperature: false,
    degreeFahrenheit: false,
    screens: [],
    unknownOptions: {},
  },
  warnings: [],
  errors: [],
  version: 'v3',
  score: 10,
  ...overrides,
})

describe('github scraper', () => {
  describe('createContentHash', () => {
    it('creates consistent hash for same content', async () => {
      const content = 'htop_version=3\ncolor_scheme=0'
      const hash1 = await createContentHash(content)
      const hash2 = await createContentHash(content)
      expect(hash1).toBe(hash2)
    })

    it('creates different hash for different content', async () => {
      const hash1 = await createContentHash('content1')
      const hash2 = await createContentHash('content2')
      expect(hash1).not.toBe(hash2)
    })

    it('returns 64-character hex string', async () => {
      const hash = await createContentHash('some content')
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('shouldFlagConfig', () => {
    it('flags config with parse errors', () => {
      const parseResult = createMockParseResult({
        errors: [{ message: 'Invalid syntax', line: 1 }],
      })
      const result = shouldFlagConfig(parseResult, 10)
      expect(result.shouldFlag).toBe(true)
      expect(result.reason).toContain('Parse error')
    })

    it('flags config with low score', () => {
      const parseResult = createMockParseResult({ score: 3 })
      const result = shouldFlagConfig(parseResult, 10)
      expect(result.shouldFlag).toBe(true)
      expect(result.reason).toContain('score')
    })

    it('flags config that is too short', () => {
      const parseResult = createMockParseResult({ score: 10 })
      const result = shouldFlagConfig(parseResult, 3)
      expect(result.shouldFlag).toBe(true)
      expect(result.reason).toContain('short')
    })

    it('does not flag valid config with good score', () => {
      const parseResult = createMockParseResult({ score: 15 })
      const result = shouldFlagConfig(parseResult, 20)
      expect(result.shouldFlag).toBe(false)
      expect(result.reason).toBeUndefined()
    })

    it('does not flag config at minimum valid score', () => {
      const parseResult = createMockParseResult({ score: 5 })
      const result = shouldFlagConfig(parseResult, 5)
      expect(result.shouldFlag).toBe(false)
    })
  })

  describe('generateSlug', () => {
    it('generates slug from repository name', () => {
      const slug = generateSlug('user/dotfiles', 'htoprc')
      expect(slug).toMatch(/^user-dotfiles-[a-z0-9]{8}$/)
    })

    it('handles special characters in repo name', () => {
      const slug = generateSlug('user/my_awesome.dotfiles', 'config')
      expect(slug).toMatch(/^user-my-awesome-dotfiles-[a-z0-9]{8}$/)
    })

    it('generates unique slugs for same input', () => {
      const slug1 = generateSlug('user/repo', 'file')
      const slug2 = generateSlug('user/repo', 'file')
      expect(slug1).not.toBe(slug2)
    })

    it('handles long repository names', () => {
      const longName = 'user/' + 'a'.repeat(100)
      const slug = generateSlug(longName, 'file')
      expect(slug.length).toBeLessThan(80)
    })
  })

  describe('processScrapedConfig', () => {
    const validConfig = `# htop 3.x config
htop_version=3
config_reader_min_version=3
fields=0 48 17 18 38 39 40 2 46 47 49 1
hide_kernel_threads=1
hide_userland_threads=0
shadow_other_users=0
show_thread_names=0
show_program_path=1
highlight_base_name=1
highlight_deleted_exe=1
highlight_megabytes=1
highlight_threads=1
highlight_changes=0
highlight_changes_delay_secs=5
find_comm_in_cmdline=1
strip_exe_from_cmdline=1
show_merged_command=0
header_margin=1
screen_tabs=0
detailed_cpu_time=0
cpu_count_from_one=0
show_cpu_usage=1
show_cpu_frequency=0
show_cpu_temperature=0
color_scheme=0
enable_mouse=1
delay=15
hide_function_bar=0
header_layout=two_50_50
column_meters_0=LeftCPUs2 Memory Swap
column_meter_modes_0=1 1 1
column_meters_1=RightCPUs2 Tasks LoadAverage Uptime Battery Hostname
column_meter_modes_1=1 2 2 2 2 2
tree_view=1
sort_key=46
tree_sort_key=0
sort_direction=-1
tree_sort_direction=1
tree_view_always_by_pid=0
all_branches_collapsed=0`

    it('processes valid config correctly', async () => {
      const scrapedConfig = {
        content: validConfig,
        sourceUrl: 'https://github.com/user/repo/blob/main/.config/htop/htoprc',
        sourcePlatform: 'github' as const,
        author: 'testuser',
        title: 'dotfiles',
      }

      const result = await processScrapedConfig(scrapedConfig)

      expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/)
      expect(result.config).toBe(scrapedConfig)
      expect(result.parseResult).toBeDefined()
      expect(result.parseResult.score).toBeGreaterThan(0)
    })

    it('flags invalid config', async () => {
      const content = 'x'
      const scrapedConfig = {
        content,
        sourceUrl: 'https://github.com/user/repo',
        sourcePlatform: 'github' as const,
      }

      const result = await processScrapedConfig(scrapedConfig)

      expect(result.status).toBe('flagged')
      expect(result.flagReason).toBeDefined()
    })

    it('publishes valid config with good score', async () => {
      const scrapedConfig = {
        content: validConfig,
        sourceUrl: 'https://github.com/user/repo',
        sourcePlatform: 'github' as const,
      }

      const result = await processScrapedConfig(scrapedConfig)

      expect(result.status).toBe('published')
      expect(result.flagReason).toBeUndefined()
    })
  })
})
