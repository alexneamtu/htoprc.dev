import { GraphQLError } from 'graphql'
import { secureRandomString } from '../utils/random'
import {
  type GraphQLContext,
  type ConfigRow,
  type ConfigGraphQL,
  type RateLimitAction,
  RATE_LIMITS,
} from './types'

// SHA-256 hash using Web Crypto API (compatible with Cloudflare Workers)
export async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Generate a unique slug from a title
export async function generateUniqueSlug(db: D1Database, title: string): Promise<string> {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    || 'config' // Fallback if title becomes empty

  // Check if exact base slug exists using COUNT (efficient, no data transfer)
  const count = await db
    .prepare('SELECT COUNT(*) as count FROM configs WHERE slug = ?')
    .bind(baseSlug)
    .first<{ count: number }>()

  if (!count || count.count === 0) {
    return baseSlug
  }

  // Base slug exists - generate unique suffix with timestamp and random component
  // This avoids fetching all existing slugs into memory
  const timestamp = Date.now().toString(36) // Base36 timestamp (compact)
  const randomSuffix = secureRandomString(4)
  return `${baseSlug}-${timestamp}-${randomSuffix}`
}

export function requireAuthUser(ctx: GraphQLContext, userId: string): string {
  if (!ctx.auth?.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  if (ctx.auth.userId !== userId) {
    throw new GraphQLError('Forbidden', {
      extensions: { code: 'FORBIDDEN' },
    })
  }
  return ctx.auth.userId
}

/**
 * Map a database config row to GraphQL response format
 * Converts snake_case to camelCase
 */
export function mapConfigRow(row: ConfigRow): ConfigGraphQL {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    content: row.content,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    sourcePlatform: row.source_platform,
    authorId: row.author_id,
    forkedFromId: row.forked_from_id,
    status: row.status,
    score: row.score,
    likesCount: row.likes_count,
    createdAt: row.created_at,
  }
}

// Rate limiting helper
export async function checkRateLimit(
  db: D1Database,
  userId: string,
  actionType: RateLimitAction
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = RATE_LIMITS[actionType]
  const today = new Date().toISOString().split('T')[0]

  // Get current count
  const result = await db
    .prepare('SELECT count FROM rate_limits WHERE user_id = ? AND action_type = ? AND action_date = ?')
    .bind(userId, actionType, today)
    .first<{ count: number }>()

  const currentCount = result?.count ?? 0

  if (currentCount >= limit.max) {
    return { allowed: false, remaining: 0 }
  }

  // Increment count
  await db
    .prepare(`
      INSERT INTO rate_limits (user_id, action_type, action_date, count)
      VALUES (?, ?, ?, 1)
      ON CONFLICT (user_id, action_type, action_date)
      DO UPDATE SET count = count + 1
    `)
    .bind(userId, actionType, today)
    .run()

  return { allowed: true, remaining: limit.max - currentCount - 1 }
}

export async function checkAnonRateLimit(
  db: D1Database,
  anonKey: string | null,
  actionType: RateLimitAction
): Promise<{ allowed: boolean; remaining: number }> {
  if (!anonKey) {
    throw new GraphQLError('Unable to determine client IP for rate limiting', {
      extensions: { code: 'BAD_REQUEST' },
    })
  }

  const limit = RATE_LIMITS[actionType]
  const today = new Date().toISOString().split('T')[0]

  const result = await db
    .prepare(
      'SELECT count FROM anon_rate_limits WHERE anon_key = ? AND action_type = ? AND action_date = ?'
    )
    .bind(anonKey, actionType, today)
    .first<{ count: number }>()

  const currentCount = result?.count ?? 0
  if (currentCount >= limit.max) {
    return { allowed: false, remaining: 0 }
  }

  await db
    .prepare(
      `INSERT INTO anon_rate_limits (anon_key, action_type, action_date, count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT (anon_key, action_type, action_date)
       DO UPDATE SET count = count + 1`
    )
    .bind(anonKey, actionType, today)
    .run()

  return { allowed: true, remaining: limit.max - currentCount - 1 }
}
