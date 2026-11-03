// LifeFlow service worker (v9)
//  - precaches the app shell + offline page, so the installed app opens with no network
//  - hashed build assets (/assets/*): cache-first; navigations: network-first with offline fallback
//  - API GETs: network-first with a short-lived cached copy (cleared on logout via a message)
//  - Web Push with deep links, and an update flow (the page asks the new worker to take over)
const VERSION = "v9";
const SHELL_CACHE = `lifeflow-shell-${VERSION}`;
const ASSET_CACHE = `lifeflow-assets-${VERSION}`;
const API_CACHE = `lifeflow-api-${VERSION}`;
const SHELL_URLS = ["/", "/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/favicon-32.png"];
const API_MAX_AGE_MS = 10 * 60 * 1000;
// Never cache anything that is secret or one-time.
const API_NEVER_CACHE = [/\/auth\//, /\/otp/, /\/password/, /\/two-factor/, /\/admin\/backups/, /\/push\//, /export/, /\/tracking/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [SHELL_CACHE, ASSET_CACHE, API_CACHE];
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("lifeflow-") && !keep.includes(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  const type = event.data && event.data.type;
  if (type === "SKIP_WAITING") self.skipWaiting();
  if (type === "CLEAR_API_CACHE") event.waitUntil(caches.delete(API_CACHE));
});

// The page registers this worker as /sw.js?api=<backend origin>, so the worker knows which requests are API calls.
const API_ORIGIN = new URL(self.location.href).searchParams.get("api") || "";

function isApiRequest(url) {
  return (API_ORIGIN && url.origin === API_ORIGIN) || url.port === "8000";
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!/^https?:$/.test(url.protocol)) return;

  if (isApiRequest(url)) {
    if (API_NEVER_CACHE.some((re) => re.test(url.pathname))) return;
    event.respondWith(apiNetworkFirst(request));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((c) => c.put("/", copy)).catch(() => {});
          return response;
        })
        .catch(async () => (await caches.match("/")) || (await caches.match("/offline.html")))
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || /\.(?:png|jpg|svg|webp|woff2?|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((c) => c.put(request, copy)).catch(() => {});
            }
            return response;
          })
      )
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

async function apiNetworkFirst(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set("x-sw-cached-at", String(Date.now()));
      const body = await response.clone().blob();
      cache.put(request, new Response(body, { status: response.status, statusText: response.statusText, headers })).catch(() => {});
    }
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    if (hit) {
      const savedAt = Number(hit.headers.get("x-sw-cached-at") || 0);
      if (Date.now() - savedAt < API_MAX_AGE_MS * 6) return hit; // up to an hour old when offline
    }
    return new Response(JSON.stringify({ detail: "You are offline." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ---- Push ----
self.addEventListener("push", (event) => {
  let data = { title: "LifeFlow", body: "You have a new notification.", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (error) {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag || "lifeflow",
      renotify: true,
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          if ("navigate" in client) client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
