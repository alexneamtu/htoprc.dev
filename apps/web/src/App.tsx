import { useMemo, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Provider } from 'urql'
import { ClerkProvider } from '@clerk/clerk-react'
import { HelmetProvider } from 'react-helmet-async'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ToastProvider } from './components/Toast'
import { HomePage } from './pages/HomePage'
import { GalleryPage } from './pages/GalleryPage'
import { ConfigPage } from './pages/ConfigPage'
import { AboutPage } from './pages/AboutPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { createGraphqlClient } from './lib/graphql'
import { useAuth } from './services/auth'

// Lazy load heavy pages (CodeMirror, admin features, etc.)
const EditorPage = lazy(() => import('./pages/EditorPage').then(m => ({ default: m.EditorPage })))
const UploadPage = lazy(() => import('./pages/UploadPage').then(m => ({ default: m.UploadPage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })))
const LikesPage = lazy(() => import('./pages/LikesPage').then(m => ({ default: m.LikesPage })))
const WhatIsHtoprcPage = lazy(() => import('./pages/WhatIsHtoprcPage').then(m => ({ default: m.WhatIsHtoprcPage })))
const CustomizeHtopPage = lazy(() => import('./pages/CustomizeHtopPage').then(m => ({ default: m.CustomizeHtopPage })))
const HtopQuickGuidePage = lazy(() => import('./pages/HtopQuickGuidePage').then(m => ({ default: m.HtopQuickGuidePage })))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
    </div>
  )
}

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function GraphqlProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth()
  const client = useMemo(() => createGraphqlClient(getToken), [getToken])
  return <Provider value={client}>{children}</Provider>
}

function AppContent() {
  return (
    <HelmetProvider>
      <ToastProvider>
        <GraphqlProvider>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/editor" element={<EditorPage />} />
                <Route path="/config/:slug" element={<ConfigPage />} />
                <Route path="/what-is-htoprc" element={<WhatIsHtoprcPage />} />
                <Route path="/customize-htop" element={<CustomizeHtopPage />} />
                <Route path="/htop-config-quick-guide" element={<HtopQuickGuidePage />} />
                <Route
                  path="/upload"
                  element={
                    <ProtectedRoute>
                      <UploadPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/likes"
                  element={
                    <ProtectedRoute>
                      <LikesPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </Layout>
        </GraphqlProvider>
      </ToastProvider>
    </HelmetProvider>
  )
}

function App() {
  // If Clerk key is not configured, render without auth
  if (!CLERK_PUBLISHABLE_KEY) {
    return <AppContent />
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <AppContent />
    </ClerkProvider>
  )
}

export default App
