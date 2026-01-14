import { useQuery } from 'urql'
import type { Config } from './useConfigs'

const TOP_CONFIGS_QUERY = /* GraphQL */ `
  query TopConfigs($limit: Int) {
    configs(limit: $limit, sort: SCORE_DESC) {
      nodes {
        id
        slug
        title
        content
        score
        likesCount
      }
    }
  }
`

interface TopConfigsData {
  configs: {
    nodes: Config[]
  }
}

export function useTopConfigs(limit = 3) {
  const [result] = useQuery<TopConfigsData>({
    query: TOP_CONFIGS_QUERY,
    variables: { limit },
  })

  return result
}
