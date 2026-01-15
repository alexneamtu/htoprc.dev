import { useQuery } from 'urql'
import type { Config } from './useConfigs'

const LIKED_CONFIGS_QUERY = /* GraphQL */ `
  query LikedConfigs($userId: ID!) {
    likedConfigs(userId: $userId) {
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
