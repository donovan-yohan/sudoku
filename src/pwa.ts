// Failed or unsupported offline installation must never prevent ordinary play.
export async function registerPwa(production: boolean): Promise<void> {
  if (!production) return
  try {
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
    }
  } catch { /* Offline support is optional when browser policy or the network denies it. */ }
}
