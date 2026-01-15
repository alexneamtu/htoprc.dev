import { Routes, Route } from 'react-router-dom'
import { Provider } from 'urql'
import { ClerkProvider } from '@clerk/clerk-react'
import { HelmetProvider } from 'react-helmet-async'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { HomePage } from './pages/HomePage'
import { GalleryPage } from './pages/GalleryPage'
import { EditorPage } from './pages/EditorPage'
import { ConfigPage } from './pages/ConfigPage'
import { UploadPage } from './pages/UploadPage'
import { AdminPage } from './pages/AdminPage'
import { AboutPage } from './pages/AboutPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { client } from './lib/graphql'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function AppContent() {
  return (
    <HelmetProvider>
      <Provider value={client}>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/config/:slug" element={<ConfigPage />} />
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
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </Provider>
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
