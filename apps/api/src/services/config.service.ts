import { GraphQLError } from 'graphql'
import { parseHtoprc } from '@htoprc/parser'
import { secureRandomString } from '../utils/random'

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

export interface Config {
  id: string
  slug: string
  title: string
  content: string
  sourceType: string
  sourceUrl: string | null
  sourcePlatform: string | null
  authorId: string | null
  forkedFromId: string | null
  forked_from_id?: string | null // For field resolver compatibility
  status: string
  score: number
  likesCount: number
  createdAt: string
}

export interface CreateConfigInput {
  title: string
  content: string
  authorId: string | null
  forkedFromId?: string | null
  autoPublish?: boolean
}

export interface UpdateConfigInput {
  title?: string
  content: string
}

const CONFIG_STATUS = {
  PUBLISHED: 'published',
  PENDING: 'pending',
  REJECTED: 'rejected',
  FLAGGED: 'flagged',
  DELETED: 'deleted',
} as const

async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function generateUniqueSlug(db: D1Database, title: string): Promise<string> {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'config'

  const count = await db
    .prepare('SELECT COUNT(*) as count FROM configs WHERE slug = ?')
    .bind(baseSlug)
    .first<{ count: number }>()

  if (!count || count.count === 0) {
    return baseSlug
  }

  const timestamp = Date.now().toString(36)
  const randomSuffix = secureRandomString(4)
  return `${baseSlug}-${timestamp}-${randomSuffix}`
}

function mapConfigRow(row: ConfigRow): Config {
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
    forked_from_id: row.forked_from_id, // For field resolver
    status: row.status,
    score: row.score,
    likesCount: row.likes_count,
    createdAt: row.created_at,
  }
}

/**
 * Creates a new config.
 */
export async function createConfig(
  db: D1Database,
  input: CreateConfigInput
): Promise<Config> {
  const { title, content, authorId, forkedFromId, autoPublish = false } = input

  // Validate forkedFromId if provided
  if (forkedFromId) {
    const forkedFrom = await db
      .prepare('SELECT id, status FROM configs WHERE id = ?')
      .bind(forkedFromId)
      .first<{ id: string; status: string }>()

    if (!forkedFrom) {
      throw new GraphQLError('The config you are trying to fork does not exist', {
        extensions: { code: 'NOT_FOUND' },
      })
    }
    if (forkedFrom.status !== CONFIG_STATUS.PUBLISHED) {
      throw new GraphQLError('Cannot fork a config that is not published', {
        extensions: { code: 'FORBIDDEN' },
      })
    }
  }

  const parsed = parseHtoprc(content)
  const id = crypto.randomUUID()
  const slug = await generateUniqueSlug(db, title)
  const contentHash = await sha256(content)
  const createdAt = new Date().toISOString()
  const status = autoPublish ? CONFIG_STATUS.PUBLISHED : CONFIG_STATUS.PENDING

  await db
    .prepare(
      `INSERT INTO configs (id, slug, title, content, content_hash, source_type, author_id, forked_from_id, score, htop_version, status, likes_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      slug,
      title,
      content,
      contentHash,
      'uploaded',
      authorId,
      forkedFromId || null,
      parsed.score,
      parsed.config.htopVersion ?? null,
      status,
      0,
      createdAt
    )
    .run()

  return {
    id,
    slug,
    title,
    content,
    sourceType: 'uploaded',
    sourceUrl: null,
    sourcePlatform: null,
    authorId,
    forkedFromId: forkedFromId || null,
    forked_from_id: forkedFromId || null,
    status,
    score: parsed.score,
    likesCount: 0,
    createdAt,
  }
}

/**
 * Updates an existing config's content and optionally title.
 */
export async function updateConfig(
  db: D1Database,
  id: string,
  input: UpdateConfigInput
): Promise<Config> {
  const existing = await db
    .prepare('SELECT * FROM configs WHERE id = ?')
    .bind(id)
    .first<ConfigRow>()

  if (!existing) {
    throw new GraphQLError('Config not found', {
      extensions: { code: 'NOT_FOUND' }
    })
  }

  const parsed = parseHtoprc(input.content)
  const contentHash = await sha256(input.content)
  const newTitle = input.title || existing.title

  await db
    .prepare(
      `UPDATE configs SET title = ?, content = ?, content_hash = ?, score = ?, htop_version = ? WHERE id = ?`
    )
    .bind(newTitle, input.content, contentHash, parsed.score, parsed.config.htopVersion ?? null, id)
    .run()

  return {
    id: existing.id,
    slug: existing.slug,
    title: newTitle,
    content: input.content,
    sourceType: existing.source_type,
    sourceUrl: existing.source_url,
    sourcePlatform: existing.source_platform,
    authorId: existing.author_id,
    forkedFromId: existing.forked_from_id,
    forked_from_id: existing.forked_from_id,
    status: existing.status,
    score: parsed.score,
    likesCount: existing.likes_count,
    createdAt: existing.created_at,
  }
}

/**
 * Gets a config by ID (any status).
 */
export async function getConfigById(db: D1Database, id: string): Promise<Config | null> {
  const row = await db
    .prepare('SELECT * FROM configs WHERE id = ?')
    .bind(id)
    .first<ConfigRow>()

  return row ? mapConfigRow(row) : null
}

/**
 * Gets a config row by ID (for internal use when you need the raw row).
 */
export async function getConfigRowById(db: D1Database, id: string): Promise<ConfigRow | null> {
  return await db
    .prepare('SELECT * FROM configs WHERE id = ?')
    .bind(id)
    .first<ConfigRow>()
}

/**
 * Gets a published config by ID or slug.
 */
export async function getPublishedConfig(
  db: D1Database,
  idOrSlug: string,
  bySlug = false
): Promise<Config | null> {
  const query = bySlug
    ? 'SELECT * FROM configs WHERE slug = ? AND status = ?'
    : 'SELECT * FROM configs WHERE id = ? AND status = ?'

  const row = await db
    .prepare(query)
    .bind(idOrSlug, CONFIG_STATUS.PUBLISHED)
    .first<ConfigRow>()

  return row ? mapConfigRow(row) : null
}

/**
 * Soft deletes a config by setting status to deleted.
 */
export async function softDeleteConfig(db: D1Database, id: string): Promise<void> {
  await db
    .prepare('UPDATE configs SET status = ? WHERE id = ?')
    .bind(CONFIG_STATUS.DELETED, id)
    .run()
}

/**
 * Updates a config's status.
 */
export async function updateConfigStatus(
  db: D1Database,
  id: string,
  status: string,
  rejectionReason?: string
): Promise<Config> {
  if (rejectionReason) {
    await db
      .prepare('UPDATE configs SET status = ?, rejection_reason = ? WHERE id = ?')
      .bind(status, rejectionReason, id)
      .run()
  } else {
    await db
      .prepare('UPDATE configs SET status = ? WHERE id = ?')
      .bind(status, id)
      .run()
  }

  const row = await db
    .prepare('SELECT * FROM configs WHERE id = ?')
    .bind(id)
    .first<ConfigRow>()

  if (!row) {
    throw new GraphQLError('Config not found', {
      extensions: { code: 'NOT_FOUND' }
    })
  }

  return mapConfigRow(row)
}

/**
 * Gets the forked-from config info.
 */
export async function getForkedFromConfig(
  db: D1Database,
  forkedFromId: string
): Promise<{ id: string; slug: string; title: string } | null> {
  return await db
    .prepare('SELECT id, slug, title FROM configs WHERE id = ?')
    .bind(forkedFromId)
    .first<{ id: string; slug: string; title: string }>()
}

export { CONFIG_STATUS, mapConfigRow }
