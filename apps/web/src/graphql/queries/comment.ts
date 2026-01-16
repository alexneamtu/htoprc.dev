export const MY_PENDING_COMMENTS_QUERY = /* GraphQL */ `
  query MyPendingComments($configId: ID!, $userId: ID!) {
    myPendingComments(configId: $configId, userId: $userId) {
      id
      content
      author {
        id
        username
        avatarUrl
      }
      createdAt
    }
  }
`
