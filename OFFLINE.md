# How Offline Mode Works

This app uses a Progressive Web App (PWA) setup so the **UI shell** can load without a network connection. It caches static build assets (HTML, JS, CSS, images, fonts). It does **not** cache API or GraphQL responses.

## Pieces involved

| File | Role |
|------|------|
| `vite.config.ts` | Enables `vite-plugin-pwa`, builds the service worker, defines the web manifest and which files to precache |
| `src/sw.ts` | Custom service worker: precache assets, claim clients, handle SPA navigations offline |
| `src/components/PwaStatus.tsx` | Registers the service worker in the browser and shows offline-ready / update prompts |
| `src/main.tsx` | Mounts `PwaStatus` so registration always runs |
| `src/hook/NetworkStatus.ts` | Detects online/offline via `navigator.onLine` |
| `src/components/OfflineBanner.tsx` | UI banner when the device is offline (does not cache anything by itself) |

## High-level flow

```text
1. User opens the production build (preview or deployed site)
2. PwaStatus registers the service worker (sw.js)
3. Service worker installs and precaches assets from the Workbox manifest
4. clientsClaim() makes the SW control the open page
5. User sees: "The app is ready to work offline."
6. Later, when offline, the SW serves cached assets instead of the network
```

Offline only works after a **successful first visit while online**, so the service worker can download and store the assets.

## 1. Build-time: what gets cached

In `vite.config.ts`, PWA is configured with `strategies: 'injectManifest'`:

- Your custom worker is `src/sw.ts`
- On `npm run build`, Vite compiles it to `dist/sw.js`
- Workbox injects `self.__WB_MANIFEST` — a list of built files matching:

  ```ts
  '**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,woff,woff2}'
  ```

- `registerType: 'prompt'` means updates wait for the user to click **Update** (see below)

The web manifest (`manifest.webmanifest`) is also generated for installability (name, icons, `display: standalone`, etc.). Install icons and offline caching are separate concerns.

## 2. Runtime: service worker registration

`PwaStatus` uses `useRegisterSW` from `virtual:pwa-register/react`:

1. Registers `/sw.js` in the browser
2. Sets `offlineReady` when precaching finished → shows “The app is ready to work offline.”
3. Sets `needRefresh` when a new build’s SW is waiting → shows “A new version…” with an **Update** button
4. **Update** calls `updateServiceWorker(true)`, which posts `{ type: 'SKIP_WAITING' }` to the worker

## 3. Runtime: what `src/sw.ts` does

### Claim the page immediately

```ts
clientsClaim()
```

Without this, the SW may activate but not control the current tab, so offline requests still go to the network and fail.

### Activate on user update (prompt mode)

```ts
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
```

This pairs with `registerType: 'prompt'`. The new worker stays in *waiting* until the user clicks **Update**.

### Precache the app shell

```ts
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
```

- Stores listed assets in Cache Storage (`workbox-precache-…`)
- Serves them on matching requests
- Removes caches from older builds

### SPA navigations while offline

```ts
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api\//, /^\/graphql/],
  }),
)
```

For client-side routes (e.g. `/dashboard`), the SW returns the cached `index.html` so React can boot offline.

`/api/` and `/graphql` are **excluded** — those are expected to need the network (and are not cached by this worker).

## 4. Online/offline UI (not caching)

`useNetworkStatus` listens to `window` `online` / `offline` events.

`OfflineBanner` only shows a message when `navigator.onLine` is false. It does not store or restore data.

## What works offline vs what does not

| Works offline | Does not work offline |
|---------------|------------------------|
| App HTML/JS/CSS after first visit | Fresh API / GraphQL data |
| Bundled images and fonts that were precached | External links (vite.dev, GitHub, etc.) |
| SPA route navigations via cached `index.html` | Anything never visited/cached before |

## How to test

Service workers are unreliable in plain `vite`/`npm run dev`. Use a production build:

```bash
npm run build
npm run preview
```

1. Open `http://localhost:4173` **while online**
2. Wait for “The app is ready to work offline.”
3. Hard refresh once if needed (`Ctrl+Shift+R`)
4. DevTools → **Application → Service Workers**: status **activated**, page **controlled**
5. DevTools → **Cache Storage**: a `workbox-precache-*` cache with assets
6. DevTools → **Network** → check **Offline** → refresh

The UI should still load from cache.

## Troubleshooting checklist

- Preview/production URL, not only `npm run dev`
- Page must be **controlled** by the service worker
- Visit once online before testing offline
- After code changes: rebuild, then unregister old SW if stuck (Application → Service Workers → Unregister)
- Missing `pwa-192x192.png` / `pwa-512x512.png` can block **Install**, but should not block offline caching
