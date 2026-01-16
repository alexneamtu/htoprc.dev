export const CHECK_LIKE_QUERY = /* GraphQL */ `
  query CheckLike($configId: ID!, $userId: ID!) {
    hasLiked(configId: $configId, userId: $userId)
  }
`
