import type { ParseResult } from '@htoprc/parser'

export type Platform = 'github' | 'gitlab' | 'reddit' | 'gist'
export type ScraperStatus = 'running' | 'completed' | 'failed'
export type ConfigStatus = 'published' | 'flagged' | 'rejected'
export type SourceType = 'scraped' | 'uploaded'

export interface ScraperResult {
  success: boolean
  configsFound: number
  configsAdded: number
  error?: string
}

export interface ScrapedConfig {
  content: string
  sourceUrl: string
  sourcePlatform: Platform
  author?: string
  title?: string
}

export interface ProcessedConfig {
  config: ScrapedConfig
  parseResult: ParseResult
  contentHash: string
  status: ConfigStatus
  flagReason?: string
}

export interface ScraperRun {
  id: string
  platform: Platform
  status: ScraperStatus
  startedAt: Date
  completedAt?: Date
  configsFound: number
  configsAdded: number
  lastCursor?: string
  error?: string
}

export interface GitHubSearchResult {
  total_count: number
  incomplete_results: boolean
  items: GitHubSearchItem[]
}

export interface GitHubSearchItem {
  name: string
  path: string
  sha: string
  url: string
  html_url: string
  repository: {
    id: number
    full_name: string
    html_url: string
    owner: {
      login: string
    }
  }
}

export interface ScraperContext {
  db: D1Database
  githubToken?: string
}
