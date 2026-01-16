export const ADD_COMMENT_MUTATION = /* GraphQL */ `
  mutation AddComment($configId: ID!, $userId: ID!, $content: String!, $username: String, $avatarUrl: String) {
    addComment(configId: $configId, userId: $userId, content: $content, username: $username, avatarUrl: $avatarUrl) {
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

export const REPORT_CONTENT_MUTATION = /* GraphQL */ `
  mutation ReportContent($contentType: String!, $contentId: ID!, $reason: String!, $userId: ID!) {
    reportContent(contentType: $contentType, contentId: $contentId, reason: $reason, userId: $userId)
  }
`
