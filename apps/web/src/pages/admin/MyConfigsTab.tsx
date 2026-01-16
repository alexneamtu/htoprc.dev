import { useQuery, useMutation } from 'urql'
import { parseHtoprc } from '@htoprc/parser'
import { HtopPreview } from '../../components/htop/HtopPreview'
import { MY_CONFIGS_QUERY } from '../../graphql/queries'
import { DELETE_CONFIG_MUTATION } from '../../graphql/mutations'
import type { Config } from '../../graphql/types'

interface MyConfigsTabProps {
  userId: string
}

export function MyConfigsTab({ userId }: MyConfigsTabProps) {
  const [result, refetch] = useQuery<{ myConfigs: Config[] }>({
    query: MY_CONFIGS_QUERY,
    variables: { userId },
  })

  const [, deleteConfig] = useMutation(DELETE_CONFIG_MUTATION)

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this config?')) return
    const result = await deleteConfig({ id: configId, userId })
    if (!result.error) {
      refetch({ requestPolicy: 'network-only' })
    }
  }

  if (result.fetching) {
    return <p>Loading...</p>
  }

  if (result.data?.myConfigs.length === 0) {
    return <p className="text-gray-500">You haven't uploaded any configs yet.</p>
  }

  return (
    <div className="space-y-6">
      {result.data?.myConfigs.map((config) => {
        const parsed = parseHtoprc(config.content)
        return (
          <div
            key={config.id}
            className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">{config.title}</h3>
                <p className="text-sm text-gray-500">
                  Score: {config.score} | Status:{' '}
                  <span
                    className={
                      config.status === 'published'
                        ? 'text-green-500'
                        : config.status === 'pending'
                        ? 'text-yellow-500'
                        : 'text-red-500'
                    }
                  >
                    {config.status}
                  </span>{' '}
                  | {new Date(config.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/config/${config.slug}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                >
                  View
                </a>
                <a
                  href={`/editor?content=${encodeURIComponent(config.content)}&edit=${config.slug}`}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm"
                >
                  Edit
                </a>
                <button
                  onClick={() => handleDeleteConfig(config.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden bg-black p-2">
              <HtopPreview config={parsed.config} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
