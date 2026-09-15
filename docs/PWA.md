# Installed app: sessions, offline behaviour and notifications

This document covers the three things that behave differently once
Share & Copy is installed to a home screen rather than opened in a
browser tab: how a session stays alive, what the service worker does,
and how notifications are set up.

## Why an installed app used to sign you out

An installed PWA has its web view discarded whenever the operating
system wants the memory back, which on a phone is usually a few minutes
after you switch away from it. Reopening the app is therefore not
"resuming" anything: it is a fresh page load with an empty JavaScript
heap, and only what was written to `localStorage` survives.

The session then has to be rebuilt from the stored refresh token, over a
network connection that is often still waking up. Previously any failure
in that first moment - a dropped request, a cold-started backend, a 500
from the database - was treated the same as "your token is invalid", and
the stored refresh token was deleted. That is what produced "it signs me
out after a few minutes".

## How sessions work now

| Token | Lifetime | Stored | Purpose |
|-------|----------|--------|---------|
| Access token | `ACCESS_TOKEN_TTL` (default `1h`) | Memory + `token` cookie | Authorizes API calls and the socket handshake |
| Refresh token | `REFRESH_TOKEN_TTL` (default `30d`) | `localStorage` + `refreshToken` cookie | Rebuilds a session after a reload |
| Guest refresh token | `GUEST_REFRESH_TOKEN_TTL` (default `7d`) | `localStorage` | Same, for devices added by pairing code |

The rules the client follows:

* **Only the server ends a session.** A refresh is discarded only on an
  explicit rejection (HTTP 401/403 from `POST /api/auth/refresh`). A
  network error, a 429 or any 5xx is retried with backoff, and the
  stored tokens are left alone.
* **The server distinguishes the two cases.** `/api/auth/refresh`
  answers 401 with `retryable: false` when the token is genuinely dead,
  and 503 with `retryable: true` when it could not check right now.
  Protected endpoints return a `code` (`token_expired`, `token_revoked`,
  `token_invalid`) alongside the message.
* **The access token is topped up before it expires**, and again
  whenever the app returns to the foreground, regains connectivity or is
  restored from the back/forward cache.
* **The socket resolves its token per connection attempt**, so a
  reconnect after a long background period never replays an expired
  token. If the handshake is rejected over the token, the client
  refreshes and retries rather than signing out; only an explicitly
  revoked session (`Token revoked`, or a `force-logout` event) ends it.
* **Paired guest devices get a refresh token too**, so a device added by
  pairing code survives a reload like any other.
* **A cached profile** (`sac_user`) lets the app render its signed-in
  shell immediately on launch instead of flashing the login screen. It
  is a UI hint only - every request is still authorized by the server.

When the server can't be reached, the app stays signed in and shows an
"Offline - reconnecting" banner instead of redirecting to the login page.

## Service worker

`client/public/sw.js` is registered in production builds only (in
development it would serve stale bundles). It:

* serves navigations network-first with the cached shell as an offline
  fallback, so launching the app without a connection still works;
* caches content-hashed build assets as they are requested;
* **never** caches `/api/`, `/socket.io/` or `/env-config.js` - a cached
  auth response would be worse than no cache at all;
* receives push messages and handles notification clicks.

When a new build is deployed, the page offers a "Reload" toast rather
than refreshing on its own, which would cancel a transfer in progress.

## Notifications

Notifications use Web Push with VAPID, and are **per device**: enabling
them on a phone says nothing about a laptop, because a push subscription
belongs to one browser on one device.

### Setup

```bash
cd server && npm run generate-vapid
```

Put the printed `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and
`VAPID_SUBJECT` in the server environment. Clients fetch the public key
from `GET /api/push/config` at runtime, so the client build needs no
configuration. With the keys unset, push is simply disabled: the API
reports `enabled: false` and the settings panel explains that the server
doesn't offer notifications.

Keep the pair once generated - replacing it invalidates every existing
subscription, and every device has to opt in again.

### Categories

Each device chooses what it wants, on the dashboard's Notifications
panel:

| Category | Default | Sent when |
|----------|---------|-----------|
| `transfers` | on | Another device starts sending this device a file |
| `pairing` | on | A new device asks to pair with the account |
| `security` | on | A new sign-in, or a device removed from the account |
| `devices` | off | Another of the account's devices comes online |

Revoking a device also deletes its push subscriptions, so a removed
device stops receiving the account's notifications immediately.

### iOS

Safari only offers Web Push to an app **installed to the home screen**
(iOS 16.4+). In a normal Safari tab the switch is disabled and the panel
says so. The permission prompt must also be triggered by a tap, which is
why nothing subscribes automatically.

## Deploying client and server on separate Render services

The app works with the client and server on different origins - that is
what the `Authorization: Bearer` header and the `localStorage` refresh
token are for, since a cross-site `SameSite=None` cookie is routinely
dropped by Safari, Firefox and Chrome. Cookies are a fallback, never the
only channel.

It still works *better* same-origin, because the cookies become
first-party and survive as a second way back into a session. Two ways to
get there:

**1. Client served by nginx (Docker web service).** `client/nginx.conf`
already proxies both `/api` and `/socket.io` (including the WebSocket
upgrade). Point its `api_upstream` block at the backend, then build the
client with:

```
VITE_API_BASE_URL=/api
VITE_SERVER_URL=/           # same origin, so Socket.IO connects there too
```

**2. Client as a Render Static Site.** Add a rewrite rule:

| Source | Destination | Action |
|--------|-------------|--------|
| `/api/*` | `https://<your-server>.onrender.com/api/*` | Rewrite |

then build the client with `VITE_API_BASE_URL=/api`. Static-site
rewrites do **not** proxy WebSocket upgrades, so leave
`VITE_SERVER_URL` pointing at the backend origin
(`https://<your-server>.onrender.com`) for Socket.IO. The socket
authenticates with a token in the handshake and doesn't need cookies, so
this split is fine.

In both cases set `PUBLIC_URL` on the server to the client's public
origin: it drives CORS, the Socket.IO allow-list and the `Secure`
attribute on cookies.

### Render free tier

A free instance sleeps after inactivity, and the first request after it
wakes can take tens of seconds or fail outright. That is precisely the
kind of failure the client now retries instead of treating as a dead
session - but if sign-outs matter to you, a paid instance (or an
external pinger) removes the cold start entirely.
