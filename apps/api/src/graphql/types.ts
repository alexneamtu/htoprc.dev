import { GraphQLError } from 'graphql'
import type { AuthContext } from '../utils/auth'

// GraphQL context type
export interface GraphQLContext {
  db: D1Database
  auth: AuthContext | null
  anonKey: string | null
}

// Database row types
export interface ConfigRow {
  id: string
  slug: string
  title: string
  content: string
  content_hash: string
  source_type: string
  source_url: string | null
  source_platform: string | null
  author_id: string | null
  forked_from_id: string | null
  status: string
  score: number
  likes_count: number
  htop_version: string | null
  created_at: string
}

export interface CommentRow {
  id: string
  config_id: string
  author_id: string
  author_username: string
  author_avatar_url: string | null
  content: string
  status: string
  created_at: string
}

// Config type returned by GraphQL resolvers
export interface ConfigGraphQL {
  id: string
  slug: string
  title: string
  content: string
  sourceType: string
  sourceUrl: string | null
  sourcePlatform: string | null
  authorId?: string | null
  forkedFromId: string | null
  status: string
  score: number
  likesCount: number
  createdAt: string
}

// Rate limit configuration
export const RATE_LIMITS = {
  upload: { max: 3, window: 'day' },  // Reduced from 5 to mitigate abuse from shared IPs
  comment: { max: 20, window: 'day' },
  like: { max: 100, window: 'day' },
  report: { max: 10, window: 'day' },
} as const

export type RateLimitAction = keyof typeof RATE_LIMITS

// Status constants to avoid magic strings
export const CONFIG_STATUS = {
  PUBLISHED: 'published',
  PENDING: 'pending',
  REJECTED: 'rejected',
  FLAGGED: 'flagged',
  DELETED: 'deleted',
} as const

export const COMMENT_STATUS = {
  PUBLISHED: 'published',
  PENDING: 'pending',
  REJECTED: 'rejected',
} as const

export const REPORT_STATUS = {
  PENDING: 'pending',
  DISMISSED: 'dismissed',
  RESOLVED: 'resolved',
} as const

export type ConfigStatus = typeof CONFIG_STATUS[keyof typeof CONFIG_STATUS]
export type CommentStatus = typeof COMMENT_STATUS[keyof typeof COMMENT_STATUS]
export type ReportStatus = typeof REPORT_STATUS[keyof typeof REPORT_STATUS]

export class RateLimitError extends GraphQLError {
  constructor(actionType: string, max: number) {
    super(`Rate limit exceeded: You can only perform ${max} ${actionType}(s) per day`, {
      extensions: { code: 'RATE_LIMIT_EXCEEDED' }
    })
  }
}
