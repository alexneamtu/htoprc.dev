export const APPROVE_CONFIG_MUTATION = /* GraphQL */ `
  mutation ApproveConfig($id: ID!, $userId: ID!) {
    approveConfig(id: $id, userId: $userId) {
      id
      status
    }
  }
`

export const REJECT_CONFIG_MUTATION = /* GraphQL */ `
  mutation RejectConfig($id: ID!, $reason: String!, $userId: ID!) {
    rejectConfig(id: $id, reason: $reason, userId: $userId) {
      id
      status
    }
  }
`

export const APPROVE_COMMENT_MUTATION = /* GraphQL */ `
  mutation ApproveComment($id: ID!, $userId: ID!) {
    approveComment(id: $id, userId: $userId) {
      id
    }
  }
`

export const REJECT_COMMENT_MUTATION = /* GraphQL */ `
  mutation RejectComment($id: ID!, $reason: String!, $userId: ID!) {
    rejectComment(id: $id, reason: $reason, userId: $userId)
  }
`

export const DISMISS_REPORT_MUTATION = /* GraphQL */ `
  mutation DismissReport($id: ID!, $userId: ID!) {
    dismissReport(id: $id, userId: $userId)
  }
`
