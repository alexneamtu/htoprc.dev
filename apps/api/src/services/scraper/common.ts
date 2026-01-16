import { parseHtoprc } from '@htoprc/parser'
import type { ParseResult } from '@htoprc/parser'
import { sha256 } from '../../utils/crypto'
import { generateScrapedSlug } from '../../utils/slug'
import type { ScrapedConfig, ProcessedConfig } from './types'

const MIN_SCORE_THRESHOLD = 5
const MIN_LINES_THRESHOLD = 5

export const createContentHash = sha256

export function shouldFlagConfig(
  parseResult: ParseResult,
  lineCount: number
): { shouldFlag: boolean; reason?: string } {
  if (parseResult.errors.length > 0) {
    return {
      shouldFlag: true,
      reason: `Parse error: ${parseResult.errors[0]?.message ?? 'Unknown error'}`,
    }
  }

  if (lineCount < MIN_LINES_THRESHOLD) {
    return {
      shouldFlag: true,
      reason: `Config too short (${lineCount} lines, minimum ${MIN_LINES_THRESHOLD})`,
    }
  }

  if (parseResult.score < MIN_SCORE_THRESHOLD) {
    return {
      shouldFlag: true,
      reason: `Low score (${parseResult.score}, minimum ${MIN_SCORE_THRESHOLD})`,
    }
  }

  return { shouldFlag: false }
}

export function generateSlug(sourceIdentifier: string, _fileName?: string): string {
  return generateScrapedSlug(sourceIdentifier)
}

export async function processScrapedConfig(
  scrapedConfig: ScrapedConfig
): Promise<ProcessedConfig> {
  const contentHash = await createContentHash(scrapedConfig.content)
  const parseResult = parseHtoprc(scrapedConfig.content)
  const lineCount = scrapedConfig.content.split('\n').filter((l) => l.trim()).length

  const { shouldFlag, reason } = shouldFlagConfig(parseResult, lineCount)

  return {
    config: scrapedConfig,
    parseResult,
    contentHash,
    status: shouldFlag ? 'flagged' : 'published',
    flagReason: reason,
  }
}
