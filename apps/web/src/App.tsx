import { Routes, Route } from 'react-router-dom'
import { Provider } from 'urql'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { EditorPage } from './pages/EditorPage'
import { ConfigPage } from './pages/ConfigPage'
import { client } from './lib/graphql'

function App() {
  return (
    <Provider value={client}>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/config/:slug" element={<ConfigPage />} />
        </Routes>
      </Layout>
    </Provider>
  )
}

export default App
