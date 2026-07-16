import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaStatus() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('Service worker registration failed:', error)
    },
  })

  const closePrompt = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) {
    return null
  }

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 9999,
        padding: 16,
        borderRadius: 8,
        background: '#ffffff',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      }}
    >
      <p>
        {offlineReady
          ? 'The app is ready to work offline.'
          : 'A new version of the app is available.'}
      </p>

      {needRefresh && (
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
        >
          Update
        </button>
      )}

      <button type="button" onClick={closePrompt}>
        Close
      </button>
    </div>
  )
}