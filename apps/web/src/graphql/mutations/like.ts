export const TOGGLE_LIKE_MUTATION = /* GraphQL */ `
  mutation ToggleLike($configId: ID!, $userId: ID!, $username: String, $avatarUrl: String) {
    toggleLike(configId: $configId, userId: $userId, username: $username, avatarUrl: $avatarUrl) {
      liked
      likesCount
    }
  }
`
