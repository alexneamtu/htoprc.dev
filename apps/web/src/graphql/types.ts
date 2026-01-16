// Shared GraphQL types

export interface Config {
  id: string
  slug: string
  title: string
  content: string
  sourceType: string
  sourceUrl: string | null
  sourcePlatform: string | null
  authorId: string | null
  forkedFromId: string | null
  status: string
  score: number
  likesCount: number
  createdAt: string
}

export interface ForkedFromConfig {
  id: string
  slug: string
  title: string
}

export interface Comment {
  id: string
  content: string
  author: {
    id: string
    username: string
    avatarUrl: string | null
  }
  createdAt: string
}

export interface ConfigWithComments extends Config {
  forkedFrom: ForkedFromConfig | null
  comments: Comment[]
}

export interface PendingComment {
  id: string
  content: string
  configId: string
  configSlug: string
  configTitle: string
  authorId: string
  authorUsername: string
  createdAt: string
}

export interface AdminStats {
  totalConfigs: number
  publishedConfigs: number
  pendingConfigs: number
  totalComments: number
  pendingComments: number
  totalLikes: number
  pendingReports: number
}

export interface Report {
  id: string
  contentType: string
  contentId: string
  contentSlug: string | null
  contentTitle: string | null
  reason: string
  createdAt: string
}

export interface LikeResult {
  liked: boolean
  likesCount: number
}

export interface PageInfo {
  hasNextPage: boolean
  hasPreviousPage: boolean
  page: number
  totalPages: number
}

export interface ConfigConnection {
  nodes: Config[]
  pageInfo: PageInfo
  totalCount: number
}
