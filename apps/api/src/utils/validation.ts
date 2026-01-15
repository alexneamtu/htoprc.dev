/**
 * Input validation utilities for GraphQL mutations
 */

import { GraphQLError } from 'graphql'

// Maximum lengths for various fields
export const MAX_LENGTHS = {
  title: 200,
  content: 50000, // 50KB should be more than enough for htoprc
  comment: 2000,
  reason: 1000,
  search: 100,
} as const

class ValidationError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: { code: 'VALIDATION_ERROR' },
    })
  }
}

/**
 * Validate a config title
 */
export function validateTitle(title: string): string {
  const trimmed = title.trim()

  if (!trimmed) {
    throw new ValidationError('Title cannot be empty')
  }

  if (trimmed.length > MAX_LENGTHS.title) {
    throw new ValidationError(`Title cannot exceed ${MAX_LENGTHS.title} characters`)
  }

  return trimmed
}

/**
 * Validate config content (htoprc file)
 */
export function validateContent(content: string): string {
  if (!content || !content.trim()) {
    throw new ValidationError('Content cannot be empty')
  }

  if (content.length > MAX_LENGTHS.content) {
    throw new ValidationError(`Content cannot exceed ${MAX_LENGTHS.content} characters`)
  }

  return content
}

/**
 * Validate a comment
 */
export function validateComment(comment: string): string {
  const trimmed = comment.trim()

  if (!trimmed) {
    throw new ValidationError('Comment cannot be empty')
  }

  if (trimmed.length > MAX_LENGTHS.comment) {
    throw new ValidationError(`Comment cannot exceed ${MAX_LENGTHS.comment} characters`)
  }

  return trimmed
}

/**
 * Validate a reason (for reports, rejections)
 */
export function validateReason(reason: string): string {
  const trimmed = reason.trim()

  if (!trimmed) {
    throw new ValidationError('Reason cannot be empty')
  }

  if (trimmed.length > MAX_LENGTHS.reason) {
    throw new ValidationError(`Reason cannot exceed ${MAX_LENGTHS.reason} characters`)
  }

  return trimmed
}

/**
 * Escape special characters for SQL LIKE queries
 * Prevents users from using % and _ as wildcards
 */
export function escapeLikeWildcards(input: string): string {
  return input
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
}

/**
 * Validate and sanitize search input
 */
export function validateSearch(search: string | undefined): string | undefined {
  if (!search) return undefined

  const trimmed = search.trim()
  if (!trimmed) return undefined

  if (trimmed.length > MAX_LENGTHS.search) {
    throw new ValidationError(`Search query cannot exceed ${MAX_LENGTHS.search} characters`)
  }

  return escapeLikeWildcards(trimmed)
}

/**
 * Validate a UUID format
 */
export function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

/**
 * Validate a required ID parameter
 */
export function validateRequiredId(id: string | undefined | null, fieldName: string): string {
  if (!id) {
    throw new ValidationError(`${fieldName} is required`)
  }

  if (!isValidUUID(id)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`)
  }

  return id
}

/**
 * Validate a URL is safe (http/https only, no javascript: etc.)
 * Returns the URL if valid, or null if invalid
 */
export function validateSafeUrl(url: string | null | undefined): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url)
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    return url
  } catch {
    // Invalid URL format
    return null
  }
}
