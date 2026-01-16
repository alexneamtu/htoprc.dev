import { useState } from 'react'
import { useQuery } from 'urql'
import { Navigate } from 'react-router-dom'
import { SEO } from '../components/SEO'
import { useAuth } from '../services/auth'
import { IS_ADMIN_QUERY, ADMIN_STATS_QUERY } from '../graphql/queries'
import type { AdminStats } from '../graphql/types'
import {
  MyConfigsTab,
  AdminStatsTab,
  PendingConfigsTab,
  PendingCommentsTab,
  PendingReportsTab,
} from './admin'

type Tab = 'myconfigs' | 'stats' | 'configs' | 'comments' | 'reports'

export function AdminPage() {
  const auth = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('myconfigs')

  const userId = auth.user?.id

  // Check if user is admin
  const [{ data: adminData, fetching: checkingAdmin }] = useQuery<{ isAdmin: boolean }>({
    query: IS_ADMIN_QUERY,
    variables: { userId },
    pause: !userId,
  })

  const isAdmin = adminData?.isAdmin ?? false

  // Admin stats (for tab badges)
  const [statsResult] = useQuery<{ adminStats: AdminStats | null }>({
    query: ADMIN_STATS_QUERY,
    variables: { userId },
    pause: !userId || !isAdmin,
  })

  if (!auth.isLoaded || checkingAdmin) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (!auth.isSignedIn) {
    return <Navigate to="/" replace />
  }

  const stats = statsResult.data?.adminStats

  return (
    <div className="max-w-6xl mx-auto">
      <SEO title={isAdmin ? 'Admin Dashboard' : 'My Dashboard'} url="/admin" />
      <h1 className="text-3xl font-bold mb-6">{isAdmin ? 'Admin Dashboard' : 'My Dashboard'}</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <TabButton
          active={activeTab === 'myconfigs'}
          onClick={() => setActiveTab('myconfigs')}
        >
          My Configs
        </TabButton>
        {isAdmin && (
          <>
            <TabButton
              active={activeTab === 'stats'}
              onClick={() => setActiveTab('stats')}
            >
              Stats
            </TabButton>
            <TabButton
              active={activeTab === 'configs'}
              onClick={() => setActiveTab('configs')}
              badge={stats?.pendingConfigs}
            >
              Pending Configs
            </TabButton>
            <TabButton
              active={activeTab === 'comments'}
              onClick={() => setActiveTab('comments')}
              badge={stats?.pendingComments}
            >
              Pending Comments
            </TabButton>
            <TabButton
              active={activeTab === 'reports'}
              onClick={() => setActiveTab('reports')}
              badge={stats?.pendingReports}
            >
              Reports
            </TabButton>
          </>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'myconfigs' && userId && <MyConfigsTab userId={userId} />}
      {activeTab === 'stats' && isAdmin && <AdminStatsTab stats={stats ?? null} />}
      {activeTab === 'configs' && isAdmin && userId && <PendingConfigsTab userId={userId} />}
      {activeTab === 'comments' && isAdmin && userId && <PendingCommentsTab userId={userId} />}
      {activeTab === 'reports' && isAdmin && userId && <PendingReportsTab userId={userId} />}
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  badge?: number
}

function TabButton({ active, onClick, children, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 -mb-px ${
        active
          ? 'border-b-2 border-blue-500 text-blue-600'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 text-sm">({badge})</span>
      )}
    </button>
  )
}
