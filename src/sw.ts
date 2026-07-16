/// <reference lib="webworker" />

import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

// Vite PWA replaces this with the built UI assets.
precacheAndRoute(self.__WB_MANIFEST)

// Removes caches belonging to previous app builds.
cleanupOutdatedCaches()

// Required for React Router routes such as:
// /dashboard
// /settings
// /profile
//
// These routes should return the cached index.html while offline.
const navigationHandler = createHandlerBoundToURL('/index.html')

registerRoute(
  new NavigationRoute(navigationHandler, {
    denylist: [
      /^\/api\//,
      /^\/graphql/,
    ],
  }),
)