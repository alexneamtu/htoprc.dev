import { baseTypeDefs } from './base'
import { configTypeDefs } from './config'
import { commentTypeDefs } from './comment'
import { adminTypeDefs } from './admin'

const rootTypeDefs = /* GraphQL */ `
  type Query {
    health: Health!
    configs(page: Int = 1, limit: Int = 20, sort: ConfigSort = SCORE_DESC, minScore: Int = 0, search: String, level: CustomizationLevel = ALL): ConfigConnection!
    config(id: ID, slug: String): Config
    recentConfigs(limit: Int = 6): [Config!]!
    myConfigs(userId: ID!): [Config!]!
    likedConfigs(userId: ID!): [Config!]!
    adminStats(userId: ID!): AdminStats
    pendingConfigs(userId: ID!): [Config!]!
    pendingComments(userId: ID!): [PendingComment!]!
    pendingReports(userId: ID!): [Report!]!
    isAdmin(userId: ID!): Boolean!
    hasLiked(configId: ID!, userId: ID!): Boolean!
    myPendingComments(configId: ID!, userId: ID!): [Comment!]!
  }

  type Mutation {
    uploadConfig(input: UploadConfigInput!): Config!
    updateConfig(id: ID!, title: String, content: String!, userId: ID!): Config!
    forkConfig(id: ID!, title: String!, userId: ID!): Config!
    toggleLike(configId: ID!, userId: ID!, username: String, avatarUrl: String): LikeResult!
    addComment(configId: ID!, userId: ID!, content: String!, username: String, avatarUrl: String): Comment!
    approveConfig(id: ID!, userId: ID!): Config!
    rejectConfig(id: ID!, reason: String!, userId: ID!): Config!
    approveComment(id: ID!, userId: ID!): Comment!
    rejectComment(id: ID!, reason: String!, userId: ID!): Boolean!
    reportContent(contentType: String!, contentId: ID!, reason: String!, userId: ID!): Boolean!
    dismissReport(id: ID!, userId: ID!): Boolean!
    deleteConfig(id: ID!, userId: ID!): Boolean!
  }
`

export const typeDefs = [
  baseTypeDefs,
  configTypeDefs,
  commentTypeDefs,
  adminTypeDefs,
  rootTypeDefs,
].join('\n')
