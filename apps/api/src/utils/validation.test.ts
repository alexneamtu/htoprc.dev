import { describe, it, expect } from 'vitest'
import {
  MAX_LENGTHS,
  validateTitle,
  validateContent,
  validateComment,
  validateReason,
  escapeLikeWildcards,
  validateSearch,
  isValidUUID,
  validateRequiredId,
  validateSafeUrl,
} from './validation'

describe('validateTitle', () => {
  it('returns trimmed title for valid input', () => {
    expect(validateTitle('  My Config  ')).toBe('My Config')
  })

  it('throws for empty title', () => {
    expect(() => validateTitle('')).toThrow('Title cannot be empty')
  })

  it('throws for whitespace-only title', () => {
    expect(() => validateTitle('   ')).toThrow('Title cannot be empty')
  })

  it('throws for title exceeding max length', () => {
    const longTitle = 'a'.repeat(MAX_LENGTHS.title + 1)
    expect(() => validateTitle(longTitle)).toThrow(
      `Title cannot exceed ${MAX_LENGTHS.title} characters`
    )
  })

  it('allows title at max length', () => {
    const maxTitle = 'a'.repeat(MAX_LENGTHS.title)
    expect(validateTitle(maxTitle)).toBe(maxTitle)
  })
})

describe('validateContent', () => {
  it('returns content for valid input', () => {
    expect(validateContent('htop config content')).toBe('htop config content')
  })

  it('throws for empty content', () => {
    expect(() => validateContent('')).toThrow('Content cannot be empty')
  })

  it('throws for whitespace-only content', () => {
    expect(() => validateContent('   ')).toThrow('Content cannot be empty')
  })

  it('throws for content exceeding max length', () => {
    const longContent = 'a'.repeat(MAX_LENGTHS.content + 1)
    expect(() => validateContent(longContent)).toThrow(
      `Content cannot exceed ${MAX_LENGTHS.content} characters`
    )
  })

  it('allows content at max length', () => {
    const maxContent = 'a'.repeat(MAX_LENGTHS.content)
    expect(validateContent(maxContent)).toBe(maxContent)
  })
})

describe('validateComment', () => {
  it('returns trimmed comment for valid input', () => {
    expect(validateComment('  Nice config!  ')).toBe('Nice config!')
  })

  it('throws for empty comment', () => {
    expect(() => validateComment('')).toThrow('Comment cannot be empty')
  })

  it('throws for whitespace-only comment', () => {
    expect(() => validateComment('   ')).toThrow('Comment cannot be empty')
  })

  it('throws for comment exceeding max length', () => {
    const longComment = 'a'.repeat(MAX_LENGTHS.comment + 1)
    expect(() => validateComment(longComment)).toThrow(
      `Comment cannot exceed ${MAX_LENGTHS.comment} characters`
    )
  })
})

describe('validateReason', () => {
  it('returns trimmed reason for valid input', () => {
    expect(validateReason('  Spam content  ')).toBe('Spam content')
  })

  it('throws for empty reason', () => {
    expect(() => validateReason('')).toThrow('Reason cannot be empty')
  })

  it('throws for whitespace-only reason', () => {
    expect(() => validateReason('   ')).toThrow('Reason cannot be empty')
  })

  it('throws for reason exceeding max length', () => {
    const longReason = 'a'.repeat(MAX_LENGTHS.reason + 1)
    expect(() => validateReason(longReason)).toThrow(
      `Reason cannot exceed ${MAX_LENGTHS.reason} characters`
    )
  })
})

describe('escapeLikeWildcards', () => {
  it('escapes percent sign', () => {
    expect(escapeLikeWildcards('100% complete')).toBe('100\\% complete')
  })

  it('escapes underscore', () => {
    expect(escapeLikeWildcards('user_name')).toBe('user\\_name')
  })

  it('escapes backslash', () => {
    expect(escapeLikeWildcards('path\\to\\file')).toBe('path\\\\to\\\\file')
  })

  it('escapes multiple special characters', () => {
    expect(escapeLikeWildcards('50%_done\\')).toBe('50\\%\\_done\\\\')
  })

  it('returns string unchanged if no special chars', () => {
    expect(escapeLikeWildcards('normal text')).toBe('normal text')
  })
})

describe('validateSearch', () => {
  it('returns undefined for undefined input', () => {
    expect(validateSearch(undefined)).toBeUndefined()
  })

  it('returns undefined for empty string', () => {
    expect(validateSearch('')).toBeUndefined()
  })

  it('returns undefined for whitespace-only string', () => {
    expect(validateSearch('   ')).toBeUndefined()
  })

  it('returns trimmed and escaped search term', () => {
    expect(validateSearch('  test%query  ')).toBe('test\\%query')
  })

  it('throws for search exceeding max length', () => {
    const longSearch = 'a'.repeat(MAX_LENGTHS.search + 1)
    expect(() => validateSearch(longSearch)).toThrow(
      `Search query cannot exceed ${MAX_LENGTHS.search} characters`
    )
  })
})

describe('isValidUUID', () => {
  it('returns true for valid UUID v4', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  it('returns true for uppercase UUID', () => {
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
  })

  it('returns false for invalid UUID format', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false)
  })

  it('returns false for UUID without dashes', () => {
    expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false)
  })

  it('returns false for UUID with wrong length', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isValidUUID('')).toBe(false)
  })
})

describe('validateRequiredId', () => {
  it('returns valid UUID', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(validateRequiredId(uuid, 'configId')).toBe(uuid)
  })

  it('throws for undefined id', () => {
    expect(() => validateRequiredId(undefined, 'configId')).toThrow('configId is required')
  })

  it('throws for null id', () => {
    expect(() => validateRequiredId(null, 'configId')).toThrow('configId is required')
  })

  it('accepts alphanumeric IDs with hyphens and underscores', () => {
    expect(validateRequiredId('seed-001', 'configId')).toBe('seed-001')
    expect(validateRequiredId('user_38HcEJgEvxmYq06pdkLUW4hEmzO', 'userId')).toBe('user_38HcEJgEvxmYq06pdkLUW4hEmzO')
    expect(validateRequiredId('not-a-uuid', 'configId')).toBe('not-a-uuid')
  })

  it('throws for IDs with invalid characters', () => {
    expect(() => validateRequiredId('id with spaces', 'configId')).toThrow(
      'configId must be a valid ID'
    )
    expect(() => validateRequiredId('id;DROP TABLE', 'configId')).toThrow(
      'configId must be a valid ID'
    )
    expect(() => validateRequiredId('../etc/passwd', 'configId')).toThrow(
      'configId must be a valid ID'
    )
  })
})

describe('validateSafeUrl', () => {
  it('returns null for undefined input', () => {
    expect(validateSafeUrl(undefined)).toBeNull()
  })

  it('returns null for null input', () => {
    expect(validateSafeUrl(null)).toBeNull()
  })

  it('returns valid https URL', () => {
    const url = 'https://example.com/path'
    expect(validateSafeUrl(url)).toBe(url)
  })

  it('returns valid http URL', () => {
    const url = 'http://example.com/path'
    expect(validateSafeUrl(url)).toBe(url)
  })

  it('returns null for javascript: protocol', () => {
    expect(validateSafeUrl('javascript:alert(1)')).toBeNull()
  })

  it('returns null for data: protocol', () => {
    expect(validateSafeUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
  })

  it('returns null for file: protocol', () => {
    expect(validateSafeUrl('file:///etc/passwd')).toBeNull()
  })

  it('returns null for invalid URL', () => {
    expect(validateSafeUrl('not a valid url')).toBeNull()
  })
})
