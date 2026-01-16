import { useQuery } from 'urql'
import { TOP_CONFIGS_QUERY } from '../graphql/queries'
import type { Config } from '../graphql/types'

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
