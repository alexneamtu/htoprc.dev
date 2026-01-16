export interface LikeResult {
  liked: boolean
  likesCount: number
}

/**
 * Checks if a user has liked a config.
 */
export async function hasUserLiked(
  db: D1Database,
  configId: string,
  userId: string
): Promise<boolean> {
  const like = await db
    .prepare('SELECT 1 FROM likes WHERE config_id = ? AND user_id = ?')
    .bind(configId, userId)
    .first()
  return !!like
}

/**
 * Adds a like to a config.
 */
export async function addLike(
  db: D1Database,
  configId: string,
  userId: string
): Promise<number> {
  await db
    .prepare('INSERT INTO likes (user_id, config_id) VALUES (?, ?)')
    .bind(userId, configId)
    .run()

  await db
    .prepare('UPDATE configs SET likes_count = likes_count + 1 WHERE id = ?')
    .bind(configId)
    .run()

  const config = await db
    .prepare('SELECT likes_count FROM configs WHERE id = ?')
    .bind(configId)
    .first<{ likes_count: number }>()

  return config?.likes_count ?? 0
}

/**
 * Removes a like from a config.
 */
export async function removeLike(
  db: D1Database,
  configId: string,
  userId: string
): Promise<number> {
  await db
    .prepare('DELETE FROM likes WHERE user_id = ? AND config_id = ?')
    .bind(userId, configId)
    .run()

  await db
    .prepare('UPDATE configs SET likes_count = MAX(likes_count - 1, 0) WHERE id = ?')
    .bind(configId)
    .run()

  const config = await db
    .prepare('SELECT likes_count FROM configs WHERE id = ?')
    .bind(configId)
    .first<{ likes_count: number }>()

  return config?.likes_count ?? 0
}

/**
 * Toggles a like on a config.
 */
export async function toggleLike(
  db: D1Database,
  configId: string,
  userId: string
): Promise<LikeResult> {
  const alreadyLiked = await hasUserLiked(db, configId, userId)

  if (alreadyLiked) {
    const likesCount = await removeLike(db, configId, userId)
    return { liked: false, likesCount }
  } else {
    const likesCount = await addLike(db, configId, userId)
    return { liked: true, likesCount }
  }
}

/**
 * Gets the current like count for a config.
 */
export async function getLikesCount(db: D1Database, configId: string): Promise<number> {
  const config = await db
    .prepare('SELECT likes_count FROM configs WHERE id = ?')
    .bind(configId)
    .first<{ likes_count: number }>()

  return config?.likes_count ?? 0
}
