export const commentTypeDefs = /* GraphQL */ `
  type Comment {
    id: ID!
    content: String!
    author: CommentAuthor!
    createdAt: String!
  }

  type CommentAuthor {
    id: ID!
    username: String!
    avatarUrl: String
  }

  type PendingComment {
    id: ID!
    content: String!
    configId: ID!
    configSlug: String!
    configTitle: String!
    authorId: ID!
    authorUsername: String!
    createdAt: String!
  }
`
