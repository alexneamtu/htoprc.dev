import { GraphQLError } from 'graphql'

export interface Report {
  id: string
  contentType: string
  contentId: string
  contentSlug: string | null
  contentTitle: string | null
  reason: string
  createdAt: string
}

const REPORT_STATUS = {
  PENDING: 'pending',
  DISMISSED: 'dismissed',
  RESOLVED: 'resolved',
} as const

const CONFIG_STATUS = {
  PUBLISHED: 'published',
  PENDING: 'pending',
  FLAGGED: 'flagged',
} as const

const COMMENT_STATUS = {
  PUBLISHED: 'published',
  PENDING: 'pending',
} as const

/**
 * Creates a new content report.
 */
export async function createReport(
  db: D1Database,
  contentType: 'config' | 'comment',
  contentId: string,
  reporterId: string,
  reason: string
): Promise<string> {
  const id = crypto.randomUUID()

  await db
    .prepare(
      `INSERT INTO reports (id, content_type, content_id, reporter_id, reason, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`
    )
    .bind(id, contentType, contentId, reporterId, reason)
    .run()

  // Flag the content for review
  if (contentType === 'config') {
    await db
      .prepare('UPDATE configs SET status = ? WHERE id = ? AND status = ?')
      .bind(CONFIG_STATUS.FLAGGED, contentId, CONFIG_STATUS.PUBLISHED)
      .run()
  } else if (contentType === 'comment') {
    await db
      .prepare('UPDATE comments SET status = ? WHERE id = ? AND status = ?')
      .bind(COMMENT_STATUS.PENDING, contentId, COMMENT_STATUS.PUBLISHED)
      .run()
  }

  return id
}

/**
 * Gets all pending reports (for admin).
 */
export async function getPendingReports(db: D1Database): Promise<Report[]> {
  const result = await db
    .prepare(`
      SELECT r.id, r.content_type, r.content_id, r.reason, r.created_at,
             CASE
               WHEN r.content_type = 'config' THEN cfg.slug
               WHEN r.content_type = 'comment' THEN cfg2.slug
             END as content_slug,
             CASE
               WHEN r.content_type = 'config' THEN cfg.title
               WHEN r.content_type = 'comment' THEN cfg2.title
             END as content_title
      FROM reports r
      LEFT JOIN configs cfg ON r.content_type = 'config' AND r.content_id = cfg.id
      LEFT JOIN comments cmt ON r.content_type = 'comment' AND r.content_id = cmt.id
      LEFT JOIN configs cfg2 ON cmt.config_id = cfg2.id
      WHERE r.status = ?
      ORDER BY r.created_at DESC
    `)
    .bind(REPORT_STATUS.PENDING)
    .all<{
      id: string
      content_type: string
      content_id: string
      content_slug: string | null
      content_title: string | null
      reason: string
      created_at: string
    }>()

  return (result.results ?? []).map((row) => ({
    id: row.id,
    contentType: row.content_type,
    contentId: row.content_id,
    contentSlug: row.content_slug,
    contentTitle: row.content_title,
    reason: row.reason,
    createdAt: row.created_at,
  }))
}

/**
 * Dismisses a report and restores the content.
 */
export async function dismissReport(db: D1Database, id: string): Promise<boolean> {
  const report = await db
    .prepare('SELECT content_type, content_id FROM reports WHERE id = ?')
    .bind(id)
    .first<{ content_type: string; content_id: string }>()

  if (!report) {
    return false
  }

  await db
    .prepare('UPDATE reports SET status = ? WHERE id = ?')
    .bind(REPORT_STATUS.DISMISSED, id)
    .run()

  // Restore content status
  if (report.content_type === 'config') {
    await db
      .prepare('UPDATE configs SET status = ? WHERE id = ? AND status = ?')
      .bind(CONFIG_STATUS.PUBLISHED, report.content_id, CONFIG_STATUS.FLAGGED)
      .run()
  } else if (report.content_type === 'comment') {
    await db
      .prepare('UPDATE comments SET status = ? WHERE id = ? AND status = ?')
      .bind(COMMENT_STATUS.PUBLISHED, report.content_id, COMMENT_STATUS.PENDING)
      .run()
  }

  return true
}

/**
 * Checks if a user is the author of the content.
 */
export async function isContentAuthor(
  db: D1Database,
  contentType: 'config' | 'comment',
  contentId: string,
  userId: string
): Promise<boolean> {
  if (contentType === 'config') {
    const config = await db
      .prepare('SELECT author_id FROM configs WHERE id = ?')
      .bind(contentId)
      .first<{ author_id: string | null }>()
    return config?.author_id === userId
  } else {
    const comment = await db
      .prepare('SELECT author_id FROM comments WHERE id = ?')
      .bind(contentId)
      .first<{ author_id: string }>()
    return comment?.author_id === userId
  }
}

export { REPORT_STATUS }
