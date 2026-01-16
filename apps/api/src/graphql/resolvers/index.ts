import { configQueries, configMutations, configFieldResolvers } from './config'
import { commentQueries, commentMutations } from './comment'
import { likeQueries, likeMutations } from './like'
import { adminQueries, adminMutations } from './admin'
import { reportMutations } from './report'

export const resolvers = {
  Query: {
    health: () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }),
    ...configQueries,
    ...commentQueries,
    ...likeQueries,
    ...adminQueries,
  },
  Mutation: {
    ...configMutations,
    ...commentMutations,
    ...likeMutations,
    ...adminMutations,
    ...reportMutations,
  },
  Config: configFieldResolvers,
}
