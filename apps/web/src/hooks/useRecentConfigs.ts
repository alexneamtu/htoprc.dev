import { useQuery } from 'urql'
import { RECENT_CONFIGS_QUERY } from '../graphql/queries'
import type { Config } from '../graphql/types'

export interface RecentConfigsData {
  recentConfigs: Config[]
}

export function useRecentConfigs(limit = 6) {
  const [result] = useQuery<RecentConfigsData>({
    query: RECENT_CONFIGS_QUERY,
    variables: { limit },
  })

  return result
}
