export interface User {
  id: string
  username: string
  avatarUrl: string | null
  isTrusted: boolean
  isAdmin: boolean
}

export interface EnsureUserOptions {
  username?: string
  avatarUrl?: string
}

/**
 * Ensures a user exists in the database, creating them if necessary.
 * Optionally updates their profile if username/avatar are provided.
 */
export async function ensureUser(
  db: D1Database,
  userId: string,
  options: EnsureUserOptions = {}
): Promise<User> {
  const { username, avatarUrl } = options
  const finalUsername = username || 'User'

  const existing = await db
    .prepare('SELECT id, username, avatar_url, is_trusted, is_admin FROM users WHERE id = ?')
    .bind(userId)
    .first<{
      id: string
      username: string
      avatar_url: string | null
      is_trusted: number
      is_admin: number
    }>()

  if (!existing) {
    await db
      .prepare('INSERT INTO users (id, username, avatar_url, is_trusted, is_admin) VALUES (?, ?, ?, 0, 0)')
      .bind(userId, finalUsername, avatarUrl || null)
      .run()

    return {
      id: userId,
      username: finalUsername,
      avatarUrl: avatarUrl || null,
      isTrusted: false,
      isAdmin: false,
    }
  }

  // Update profile if new values provided
  if (username || avatarUrl) {
    const updatedUsername = username || existing.username
    const updatedAvatarUrl = avatarUrl || existing.avatar_url

    await db
      .prepare('UPDATE users SET username = ?, avatar_url = ? WHERE id = ?')
      .bind(updatedUsername, updatedAvatarUrl, userId)
      .run()

    return {
      id: existing.id,
      username: updatedUsername,
      avatarUrl: updatedAvatarUrl,
      isTrusted: existing.is_trusted === 1,
      isAdmin: existing.is_admin === 1,
    }
  }

  return {
    id: existing.id,
    username: existing.username,
    avatarUrl: existing.avatar_url,
    isTrusted: existing.is_trusted === 1,
    isAdmin: existing.is_admin === 1,
  }
}

/**
 * Gets a user's trust and admin status.
 * Returns null if user doesn't exist.
 */
export async function getUserStatus(
  db: D1Database,
  userId: string
): Promise<{ isTrusted: boolean; isAdmin: boolean } | null> {
  const user = await db
    .prepare('SELECT is_trusted, is_admin FROM users WHERE id = ?')
    .bind(userId)
    .first<{ is_trusted: number; is_admin: number }>()

  if (!user) return null

  return {
    isTrusted: user.is_trusted === 1,
    isAdmin: user.is_admin === 1,
  }
}

/**
 * Marks a user as trusted.
 */
export async function markUserTrusted(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare('UPDATE users SET is_trusted = 1 WHERE id = ?')
    .bind(userId)
    .run()
}

/**
 * Checks if a user exists in the database.
 */
export async function userExists(db: D1Database, userId: string): Promise<boolean> {
  const result = await db
    .prepare('SELECT 1 FROM users WHERE id = ?')
    .bind(userId)
    .first()
  return !!result
}
