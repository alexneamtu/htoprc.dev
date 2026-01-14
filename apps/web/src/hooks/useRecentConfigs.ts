import { useQuery } from 'urql'
import type { Config } from './useConfigs'

const RECENT_CONFIGS_QUERY = /* GraphQL */ `
  query RecentConfigs($limit: Int) {
    recentConfigs(limit: $limit) {
      id
      slug
      title
      content
      sourceType
      sourceUrl
      sourcePlatform
      status
      score
      likesCount
      createdAt
    }
  }
`

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
