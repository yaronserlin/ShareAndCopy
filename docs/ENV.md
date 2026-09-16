# Environment Variables

<!-- AUTO-GENERATED: from server/.env.example and client/.env.example -->

## Server (`server/.env`)

| Variable | Required | Description | Example / Default |
|----------|----------|--------------|--------------------|
| `MONGO_URI` | Yes | MongoDB connection string | `mongodb://localhost:27017/shareandcopy` |
| `JWT_SECRET` | Yes | Secret used to sign access/pairing JWTs | long random string |
| `JWT_REFRESH_SECRET` | Yes | Secret used to sign refresh tokens | long random string, different from `JWT_SECRET` |
| `PORT` | No | Port the server listens on | default `5000`; set to `5001` for local dev to match `startup.sh` and the client defaults |
| `NODE_ENV` | No | Runtime environment | default `development` |
| `PUBLIC_URL` | No | Public client origin, used for CORS and app links | e.g. `https://app.example.com` |
| `LOG_LEVEL` | No | Logging verbosity: `error`, `warn`, `info`, `http`, or `debug` | default `debug` in development/test, `warn` otherwise |
| `ACCESS_TOKEN_TTL` | No | Access token lifetime (`jsonwebtoken` duration format) | default `1h` |
| `REFRESH_TOKEN_TTL` | No | Refresh token lifetime, i.e. how long a device stays signed in | default `30d` |
| `GUEST_REFRESH_TOKEN_TTL` | No | Refresh token lifetime for paired guest devices | default `7d` |
| `VAPID_PUBLIC_KEY` | No | Web Push public key; push is disabled when unset | generate with `npm run generate-vapid` |
| `VAPID_PRIVATE_KEY` | No | Web Push private key; push is disabled when unset | generate with `npm run generate-vapid` |
| `VAPID_SUBJECT` | No | Contact URI sent to push services | default `mailto:admin@shareandcopy.app` |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limiter window in ms | default `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max requests per window per client | default `100` |
| `TURN_URL` | No | WebRTC TURN relay URL | unset disables TURN |
| `TURN_SECRET` | Conditional | TURN shared secret; **required if `TURN_URL` is set** | — |
| `TURN_USER` | No | TURN username | default `user` |
| `METRICS_TOKEN` | No | Bearer token required to read `/metrics`; endpoint 404s if unset | — |
| `SEED_PASSWORD` | No | Password used by `server/seeder.js` only; the seeder refuses to run when `NODE_ENV=production` regardless of this value | — |

## Client (`client/.env`)

| Variable | Required | Description | Example / Default |
|----------|----------|--------------|--------------------|
| `VITE_SERVER_URL` | No | Backend origin, used for Socket.IO; falls back to `window.SERVER_URL` (injected by `startup.sh`) if unset. Use `/` when the client host proxies the backend onto its own origin | `http://localhost:5001` |
| `VITE_API_BASE_URL` | No | Full API base URL used by the client's API calls. Set it to the relative path `/api` when the client host proxies the API onto its own origin (see `docs/PWA.md`), which makes the auth cookies first-party | `http://localhost:5001/api` |

<!-- /AUTO-GENERATED -->
