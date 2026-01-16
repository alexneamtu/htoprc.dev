import { useQuery } from 'urql'
import { LIKED_CONFIGS_QUERY } from '../graphql/queries'
import type { Config } from '../graphql/types'

export interface LikedConfigsData {
  likedConfigs: Config[]
}

export function useLikedConfigs(userId: string | undefined) {
  const [result] = useQuery<LikedConfigsData>({
    query: LIKED_CONFIGS_QUERY,
    variables: { userId },
    pause: !userId,
  })

  return result
}
