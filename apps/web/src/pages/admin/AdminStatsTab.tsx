import { StatCard } from './StatCard'
import type { AdminStats } from '../../graphql/types'

interface AdminStatsTabProps {
  stats: AdminStats | null
}

export function AdminStatsTab({ stats }: AdminStatsTabProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <StatCard label="Total Configs" value={stats?.totalConfigs ?? 0} />
      <StatCard label="Published" value={stats?.publishedConfigs ?? 0} />
      <StatCard label="Pending Review" value={stats?.pendingConfigs ?? 0} color="yellow" />
      <StatCard label="Total Comments" value={stats?.totalComments ?? 0} />
      <StatCard label="Pending Comments" value={stats?.pendingComments ?? 0} color="yellow" />
      <StatCard label="Total Likes" value={stats?.totalLikes ?? 0} color="red" />
      <StatCard label="Reports" value={stats?.pendingReports ?? 0} color="red" />
    </div>
  )
}
