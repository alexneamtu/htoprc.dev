/**
 * Authentication and authorization utilities
 */

/**
 * Check if a user has admin privileges
 */
export async function isUserAdmin(db: D1Database, userId: string): Promise<boolean> {
  if (!userId) return false

  const user = await db
    .prepare('SELECT is_admin FROM users WHERE id = ?')
    .bind(userId)
    .first<{ is_admin: number }>()

  return user?.is_admin === 1
}

/**
 * Check if a user is trusted (for rate limiting bypass)
 */
export async function isUserTrusted(db: D1Database, userId: string): Promise<boolean> {
  if (!userId) return false

  const user = await db
    .prepare('SELECT is_trusted FROM users WHERE id = ?')
    .bind(userId)
    .first<{ is_trusted: number }>()

  return user?.is_trusted === 1
}
