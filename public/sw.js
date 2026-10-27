// Minimal service worker. It exists only so browsers regard Derby Day as an
// installable app. It does not cache anything or intercept requests.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
