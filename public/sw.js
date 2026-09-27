// Tracker service worker: shows task reminders sent via Web Push and opens the
// relevant page when one is tapped. It deliberately does no caching.

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : "" }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Tracker", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/badge-96.png",
      tag: data.tag,
      data: { url: typeof data.url === "string" ? data.url : "/board" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || "/board", self.location.origin)
  // Only ever navigate within this app.
  if (target.origin !== self.location.origin) return

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      const existing = windows.find((client) => new URL(client.url).origin === target.origin)
      if (existing) {
        try {
          // navigate() only works for windows this worker already controls.
          const navigated = await existing.navigate(target.href)
          await (navigated || existing).focus()
          return
        } catch {
          // Fall through to a fresh window.
        }
      }
      await self.clients.openWindow(target.href)
    })()
  )
})
