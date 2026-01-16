import { GraphQLError } from 'graphql'
import { COMMENT_STATUS } from '../graphql/types'

interface CommentJoinRow {
  id: string
  content: string
  created_at: string
  author_id: string
  author_username: string
  author_avatar_url: string | null
}

export interface Comment {
  id: string
  content: string
  author: {
    id: string
    username: string
    avatarUrl: string | null
  }
  createdAt: string
}

export interface PendingComment {
  id: string
  content: string
  configId: string
  configSlug: string
  configTitle: string
  authorId: string
  authorUsername: string
  createdAt: string
}

export interface AddCommentInput {
  configId: string
  authorId: string
  authorUsername: string
  authorAvatarUrl: string | null
  content: string
  autoPublish: boolean
}

/**
 * Adds a new comment to a config.
 */
export async function addComment(
  db: D1Database,
  input: AddCommentInput
): Promise<Comment> {
  const { configId, authorId, authorUsername, authorAvatarUrl, content, autoPublish } = input
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const status = autoPublish ? COMMENT_STATUS.PUBLISHED : COMMENT_STATUS.PENDING

  await db
    .prepare(
      'INSERT INTO comments (id, config_id, author_id, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(id, configId, authorId, content, status, createdAt)
    .run()

  return {
    id,
    content,
    author: {
      id: authorId,
      username: authorUsername,
      avatarUrl: authorAvatarUrl,
    },
    createdAt,
  }
}

/**
 * Gets published comments for a config.
 */
export async function getCommentsForConfig(
  db: D1Database,
  configId: string
): Promise<Comment[]> {
  const result = await db
    .prepare(`
      SELECT c.id, c.content, c.created_at, c.author_id,
             u.username as author_username, u.avatar_url as author_avatar_url
      FROM comments c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.config_id = ? AND c.status = ?
      ORDER BY c.created_at ASC
    `)
    .bind(configId, COMMENT_STATUS.PUBLISHED)
    .all<CommentJoinRow>()

  return (result.results ?? []).map((row) => ({
    id: row.id,
    content: row.content,
    author: {
      id: row.author_id,
      username: row.author_username ?? 'Anonymous',
      avatarUrl: row.author_avatar_url,
    },
    createdAt: row.created_at,
  }))
}

/**
 * Gets pending comments by a specific user for a config.
 */
export async function getPendingCommentsByUser(
  db: D1Database,
  configId: string,
  userId: string
): Promise<Comment[]> {
  const result = await db
    .prepare(`
      SELECT c.id, c.content, c.created_at, c.author_id,
             u.username as author_username, u.avatar_url as author_avatar_url
      FROM comments c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.config_id = ? AND c.author_id = ? AND c.status = ?
      ORDER BY c.created_at ASC
    `)
    .bind(configId, userId, COMMENT_STATUS.PENDING)
    .all<CommentJoinRow>()

  return (result.results ?? []).map((row) => ({
    id: row.id,
    content: row.content,
    author: {
      id: row.author_id,
      username: row.author_username ?? 'Anonymous',
      avatarUrl: row.author_avatar_url,
    },
    createdAt: row.created_at,
  }))
}

/**
 * Gets all pending comments (for admin).
 */
export async function getAllPendingComments(db: D1Database): Promise<PendingComment[]> {
  const result = await db
    .prepare(`
      SELECT c.id, c.content, c.config_id, c.author_id, c.created_at,
             cfg.slug as config_slug,
             cfg.title as config_title,
             u.username as author_username
      FROM comments c
      LEFT JOIN configs cfg ON c.config_id = cfg.id
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.status = ?
      ORDER BY c.created_at DESC
    `)
    .bind(COMMENT_STATUS.PENDING)
    .all<{
      id: string
      content: string
      config_id: string
      config_slug: string
      config_title: string
      author_id: string
      author_username: string
      created_at: string
    }>()

  return (result.results ?? []).map((row) => ({
    id: row.id,
    content: row.content,
    configId: row.config_id,
    configSlug: row.config_slug ?? '',
    configTitle: row.config_title ?? 'Unknown',
    authorId: row.author_id,
    authorUsername: row.author_username ?? 'Anonymous',
    createdAt: row.created_at,
  }))
}

/**
 * Approves a comment and marks the author as trusted.
 */
export async function approveComment(db: D1Database, id: string): Promise<Comment> {
  await db
    .prepare('UPDATE comments SET status = ? WHERE id = ?')
    .bind(COMMENT_STATUS.PUBLISHED, id)
    .run()

  // Mark author as trusted
  const comment = await db
    .prepare('SELECT author_id FROM comments WHERE id = ?')
    .bind(id)
    .first<{ author_id: string }>()

  if (comment) {
    await db
      .prepare('UPDATE users SET is_trusted = 1 WHERE id = ?')
      .bind(comment.author_id)
      .run()
  }

  const row = await db
    .prepare(`
      SELECT c.id, c.content, c.created_at, c.author_id,
             u.username as author_username, u.avatar_url as author_avatar_url
      FROM comments c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `)
    .bind(id)
    .first<CommentJoinRow>()

  if (!row) {
    throw new GraphQLError('Comment not found', {
      extensions: { code: 'NOT_FOUND' }
    })
  }

  return {
    id: row.id,
    content: row.content,
    author: {
      id: row.author_id,
      username: row.author_username ?? 'Anonymous',
      avatarUrl: row.author_avatar_url,
    },
    createdAt: row.created_at,
  }
}

/**
 * Rejects a comment.
 */
export async function rejectComment(
  db: D1Database,
  id: string,
  reason: string
): Promise<void> {
  await db
    .prepare('UPDATE comments SET status = ?, rejection_reason = ? WHERE id = ?')
    .bind(COMMENT_STATUS.REJECTED, reason, id)
    .run()
}

/**
 * Updates a comment's status.
 */
export async function updateCommentStatus(
  db: D1Database,
  id: string,
  status: string
): Promise<void> {
  await db
    .prepare('UPDATE comments SET status = ? WHERE id = ?')
    .bind(status, id)
    .run()
}

export { COMMENT_STATUS } from '../graphql/types'
