import { useQuery, useMutation } from 'urql'
import { Link } from 'react-router-dom'
import { PENDING_REPORTS_QUERY } from '../../graphql/queries'
import { DISMISS_REPORT_MUTATION } from '../../graphql/mutations'
import type { Report } from '../../graphql/types'

interface PendingReportsTabProps {
  userId: string
}

export function PendingReportsTab({ userId }: PendingReportsTabProps) {
  const [result, refetch] = useQuery<{ pendingReports: Report[] }>({
    query: PENDING_REPORTS_QUERY,
    variables: { userId },
  })

  const [, dismissReport] = useMutation(DISMISS_REPORT_MUTATION)

  const handleDismissReport = async (id: string) => {
    await dismissReport({ id, userId })
    refetch({ requestPolicy: 'network-only' })
  }

  if (result.fetching) {
    return <p>Loading...</p>
  }

  if (result.data?.pendingReports.length === 0) {
    return <p className="text-gray-500">No pending reports.</p>
  }

  return (
    <div className="space-y-4">
      {result.data?.pendingReports.map((report) => (
        <div
          key={report.id}
          className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-2">
                <span className="font-medium capitalize">{report.contentType}</span>{' '}
                {report.contentSlug ? (
                  <Link
                    to={`/config/${report.contentSlug}`}
                    className="text-blue-500 hover:underline"
                  >
                    {report.contentTitle || report.contentId}
                  </Link>
                ) : (
                  <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">
                    {report.contentId}
                  </span>
                )}
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-2">{report.reason}</p>
              <p className="text-xs text-gray-400">
                {new Date(report.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => handleDismissReport(report.id)}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
