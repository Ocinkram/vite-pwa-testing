import { useNetworkStatus } from '../hook/NetworkStatus.ts'

export function OfflineBanner() {
  const isOnline = useNetworkStatus()

  if (isOnline) {
    return null
  }

  return (
    <div role="status">
      You are offline. Some information may be unavailable.
    </div>
  )
}