export async function cleanupOldRateLimits(db: D1Database): Promise<{ deleted: number }> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const cutoffDate = sevenDaysAgo.toISOString().split('T')[0]

  const result = await db
    .prepare('DELETE FROM anon_rate_limits WHERE action_date < ?')
    .bind(cutoffDate)
    .run()

  return { deleted: result.meta.changes ?? 0 }
}
