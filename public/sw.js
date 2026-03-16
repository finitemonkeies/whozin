self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Whozin", body: event.data?.text?.() ?? "Something changed in your circle." };
  }

  const title = payload.title || "Whozin";
  const options = {
    body: payload.body || "Open Whozin to see the latest update.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || "whozin-push",
    data: {
      url: payload.url || "/activity?src=push",
      eventId: payload.event_id || null,
      notificationId: payload.notification_id || null,
      type: payload.type || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawTargetUrl = event.notification?.data?.url || "/activity?src=push";
  const target = new URL(rawTargetUrl, self.location.origin);
  target.searchParams.set("src", "push");
  if (event.notification?.data?.notificationId) {
    target.searchParams.set("notification_id", event.notification.data.notificationId);
  }
  if (event.notification?.data?.type) {
    target.searchParams.set("push_type", event.notification.data.type);
  }
  if (event.notification?.data?.eventId) {
    target.searchParams.set("event_id", event.notification.data.eventId);
  }
  const targetUrl = `${target.pathname}${target.search}${target.hash}`;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin) {
          client.focus();
          return client.navigate(targetUrl);
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
