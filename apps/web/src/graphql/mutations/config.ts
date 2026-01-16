export const UPLOAD_CONFIG_MUTATION = /* GraphQL */ `
  mutation UploadConfig($input: UploadConfigInput!) {
    uploadConfig(input: $input) {
      id
      slug
      title
      status
    }
  }
`

export const UPDATE_CONFIG_MUTATION = /* GraphQL */ `
  mutation UpdateConfig($id: ID!, $title: String, $content: String!, $userId: ID!) {
    updateConfig(id: $id, title: $title, content: $content, userId: $userId) {
      id
      slug
      title
      content
      status
    }
  }
`

export const FORK_CONFIG_MUTATION = /* GraphQL */ `
  mutation ForkConfig($id: ID!, $title: String!, $userId: ID!) {
    forkConfig(id: $id, title: $title, userId: $userId) {
      id
      slug
      title
      status
    }
  }
`

export const DELETE_CONFIG_MUTATION = /* GraphQL */ `
  mutation DeleteConfig($id: ID!, $userId: ID!) {
    deleteConfig(id: $id, userId: $userId)
  }
`
