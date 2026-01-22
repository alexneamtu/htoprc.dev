import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from 'urql'
import { HtopPreview } from '../components/htop/HtopPreview'
import { HtoprcEditor } from '../components/editor'
import { Modal, ModalActions, ModalButton } from '../components/Modal'
import { SEO } from '../components/SEO'
import { useToast } from '../components/Toast'
import { parseHtoprc } from '@htoprc/parser'
import { useAuth } from '../services/auth'
import { useLocalStorage, useDebounce } from '../hooks'

const UPLOAD_CONFIG_MUTATION = /* GraphQL */ `
  mutation UploadConfig($input: UploadConfigInput!) {
    uploadConfig(input: $input) {
      id
      slug
      title
    }
  }
`

const UPDATE_CONFIG_MUTATION = /* GraphQL */ `
  mutation UpdateConfig($id: ID!, $title: String, $content: String!, $userId: ID!) {
    updateConfig(id: $id, title: $title, content: $content, userId: $userId) {
      id
      slug
      title
    }
  }
`

const GET_CONFIG_QUERY = /* GraphQL */ `
  query GetConfig($id: ID, $slug: String) {
    config(id: $id, slug: $slug) {
      id
      slug
      title
      authorId
    }
  }
`

const STORAGE_KEY = 'htoprc-editor-content'

const DEFAULT_HTOPRC = `# htoprc configuration
# Edit this config and see the preview update in real-time

htop_version=3.2.1
config_reader_min_version=3
fields=0 48 17 18 38 39 40 2 46 47 49 1
color_scheme=0
tree_view=0
header_layout=two_50_50
column_meters_0=AllCPUs Memory Swap
column_meter_modes_0=1 1 1
column_meters_1=Tasks LoadAverage Uptime
column_meter_modes_1=2 2 2
hide_kernel_threads=1
hide_userland_threads=0
highlight_base_name=0
highlight_megabytes=1
highlight_threads=1
`

export function EditorPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [content, setContent] = useLocalStorage(STORAGE_KEY, DEFAULT_HTOPRC)
  const debouncedContent = useDebounce(content, 100)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const { showToast } = useToast()

  // Auth state (handles disabled case internally)
  const auth = useAuth()

  // Fork and edit params (can be ID or slug)
  const forkParam = searchParams.get('fork')
  const editParam = searchParams.get('edit')

  // Helper to detect if a value is a UUID
  const isUUID = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

  // Query for config info when forking or editing (accepts ID or slug)
  const [{ data: forkData }] = useQuery({
    query: GET_CONFIG_QUERY,
    variables: forkParam ? (isUUID(forkParam) ? { id: forkParam } : { slug: forkParam }) : {},
    pause: !forkParam,
  })
  const [{ data: editData }] = useQuery({
    query: GET_CONFIG_QUERY,
    variables: editParam ? (isUUID(editParam) ? { id: editParam } : { slug: editParam }) : {},
    pause: !editParam,
  })

  const [, uploadConfig] = useMutation(UPLOAD_CONFIG_MUTATION)
  const [, updateConfig] = useMutation(UPDATE_CONFIG_MUTATION)

  const isEditing = !!editParam && !!editData?.config
  const canEdit = isEditing && auth.user?.id === editData?.config?.authorId

  // Load content from URL parameter if present
  useEffect(() => {
    const urlContent = searchParams.get('content')
    if (urlContent) {
      setContent(urlContent)
      // Keep fork/edit params, clear content param
      const newParams = new URLSearchParams()
      if (forkParam) newParams.set('fork', forkParam)
      if (editParam) newParams.set('edit', editParam)
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setContent, setSearchParams, forkParam, editParam])

  const parsed = useMemo(() => parseHtoprc(debouncedContent), [debouncedContent])

  const handleReset = useCallback(() => {
    setContent(DEFAULT_HTOPRC)
  }, [setContent])

  const handleUpload = useCallback(async () => {
    if (!uploadTitle.trim()) {
      setUploadError('Please enter a title')
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      if (isEditing && canEdit && editData?.config?.id) {
        // Update existing config
        const result = await updateConfig({
          id: editData.config.id,
          title: uploadTitle.trim(),
          content,
          userId: auth.user?.id,
        })

        if (result.error) {
          setUploadError(result.error.message)
          return
        }

        if (result.data?.updateConfig?.slug) {
          showToast('Config uploaded!', 'success')
          navigate(`/config/${result.data.updateConfig.slug}`)
        }
      } else {
        // Upload new config (possibly as fork)
        const result = await uploadConfig({
          input: {
            title: uploadTitle.trim(),
            content,
            userId: auth.user?.id || null,
            forkedFromId: forkData?.config?.id || null,
          },
        })

        if (result.error) {
          setUploadError(result.error.message)
          return
        }

        if (result.data?.uploadConfig?.slug) {
          showToast('Config uploaded!', 'success')
          navigate(`/config/${result.data.uploadConfig.slug}`)
        }
      }
    } finally {
      setIsUploading(false)
    }
  }, [uploadTitle, content, auth.user?.id, forkData?.config?.id, isEditing, canEdit, editData?.config?.id, uploadConfig, updateConfig, navigate, showToast])

  const openUploadModal = useCallback(() => {
    // Pre-fill title for editing or forking
    if (isEditing && editData?.config?.title) {
      setUploadTitle(editData.config.title)
    } else if (forkParam && forkData?.config?.title) {
      setUploadTitle(`Fork of ${forkData.config.title}`)
    } else {
      setUploadTitle('')
    }
    setUploadError(null)
    setShowUploadModal(true)
  }, [isEditing, editData?.config?.title, forkParam, forkData?.config?.title])

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-[60vh] lg:h-[calc(100vh-200px)] overflow-visible lg:overflow-hidden">
      <SEO
        title="Editor"
        description="Create and customize your htop configuration with a live preview. Edit htoprc settings visually and see real-time changes."
        url="/editor"
      />
      {/* Editor Panel */}
      <div className="flex-1 flex flex-col min-h-[300px] lg:min-h-0">
        <h2 className="text-lg lg:text-xl font-bold mb-2 shrink-0">htoprc Editor</h2>
        <div className="flex-1 min-h-[250px] lg:min-h-0 overflow-hidden">
          <HtoprcEditor value={content} onChange={setContent} />
        </div>
        {parsed.warnings.length > 0 && (
          <div className="mt-2 p-2 bg-yellow-900/50 rounded text-yellow-300 text-sm max-h-24 overflow-auto shrink-0">
            {parsed.warnings.map((w, i) => (
              <div key={i}>
                Line {w.line}: {w.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Panel */}
      <div className="flex-1 flex flex-col min-h-[300px] lg:min-h-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 shrink-0 gap-1">
          <h2 className="text-lg lg:text-xl font-bold">Preview</h2>
          <span className="text-xs sm:text-sm text-gray-500">
            <span
              title="Customization score: +10 custom color scheme, +5 tree view, +5 each meter column, +3 for >8 columns, +3 custom header layout"
              className="cursor-help border-b border-dotted border-gray-500"
            >
              Score: {parsed.score}
            </span>
            {' | '}Version: {parsed.version}
          </span>
        </div>
        <div className="flex-1 min-h-[200px] lg:min-h-0 rounded-lg p-2 sm:p-4 overflow-auto border border-gray-300 dark:border-gray-700 bg-black">
          <HtopPreview config={parsed.config} />
        </div>
        <div className="mt-3 lg:mt-4 space-y-3 shrink-0">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={openUploadModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
            >
              {isEditing && canEdit ? 'Save Changes' : forkParam ? 'Save Fork' : 'Upload to Gallery'}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(content)
                showToast('Copied to clipboard!', 'success')
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm text-gray-900 dark:text-white"
            >
              Copy Config
            </button>
            <button
              onClick={() => {
                const blob = new Blob([content], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = '.htoprc'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm text-gray-900 dark:text-white"
            >
              Download .htoprc
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm text-gray-900 dark:text-white"
            >
              Reset to Defaults
            </button>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-3 rounded font-mono border border-gray-200 dark:border-transparent">
            <div className="mb-2 text-gray-900 dark:text-gray-300 font-semibold">Install instructions:</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 select-all text-gray-700 dark:text-gray-300">mkdir -p ~/.config/htop && cat &gt; ~/.config/htop/htoprc</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('mkdir -p ~/.config/htop && cat > ~/.config/htop/htoprc')
                  showToast('Copied to clipboard!', 'success')
                }}
                className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-xs shrink-0 text-gray-900 dark:text-white"
                title="Copy command"
              >
                Copy
              </button>
            </div>
            <div className="mt-2 text-gray-500">Then paste your config and press Ctrl+D</div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={isEditing && canEdit ? 'Save Changes' : forkParam ? 'Save Fork to Gallery' : 'Upload to Gallery'}
      >
        {forkParam && !isEditing && (
          <p className="text-sm text-purple-500 mb-4">
            Forking from: {forkData?.config?.title || forkParam}
          </p>
        )}
        <input
          type="text"
          value={uploadTitle}
          onChange={(e) => setUploadTitle(e.target.value)}
          placeholder="Config title..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
          autoFocus
        />
        {uploadError && (
          <p className="text-red-500 text-sm mb-4">{uploadError}</p>
        )}
        <ModalActions>
          <ModalButton onClick={() => setShowUploadModal(false)} disabled={isUploading}>
            Cancel
          </ModalButton>
          <ModalButton onClick={handleUpload} disabled={isUploading || !uploadTitle.trim()} variant="primary">
            {isUploading ? 'Saving...' : isEditing && canEdit ? 'Save' : 'Upload'}
          </ModalButton>
        </ModalActions>
      </Modal>
    </div>
  )
}
