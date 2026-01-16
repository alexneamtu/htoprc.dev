import { GraphQLError } from 'graphql'
import { sha256 } from '../utils/crypto'
import { generateUniqueSlug } from '../utils/slug'
import {
  type GraphQLContext,
  type RateLimitAction,
  RATE_LIMITS,
  mapConfigRow,
} from './types'

export { sha256, generateUniqueSlug, mapConfigRow }

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

// Generic rate limiting helper
interface RateLimitConfig {
  table: string
  keyColumn: string
}

const RATE_LIMIT_TABLES: Record<'user' | 'anon', RateLimitConfig> = {
  user: { table: 'rate_limits', keyColumn: 'user_id' },
  anon: { table: 'anon_rate_limits', keyColumn: 'anon_key' },
}

async function checkRateLimitGeneric(
  db: D1Database,
  key: string,
  actionType: RateLimitAction,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = RATE_LIMITS[actionType]
  const today = new Date().toISOString().split('T')[0]

  const result = await db
    .prepare(
      `SELECT count FROM ${config.table} WHERE ${config.keyColumn} = ? AND action_type = ? AND action_date = ?`
    )
    .bind(key, actionType, today)
    .first<{ count: number }>()

  const currentCount = result?.count ?? 0

  if (currentCount >= limit.max) {
    return { allowed: false, remaining: 0 }
  }

  await db
    .prepare(
      `INSERT INTO ${config.table} (${config.keyColumn}, action_type, action_date, count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT (${config.keyColumn}, action_type, action_date)
       DO UPDATE SET count = count + 1`
    )
    .bind(key, actionType, today)
    .run()

  return { allowed: true, remaining: limit.max - currentCount - 1 }
}

export async function checkRateLimit(
  db: D1Database,
  userId: string,
  actionType: RateLimitAction
): Promise<{ allowed: boolean; remaining: number }> {
  return checkRateLimitGeneric(db, userId, actionType, RATE_LIMIT_TABLES.user)
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
  return checkRateLimitGeneric(db, anonKey, actionType, RATE_LIMIT_TABLES.anon)
}
