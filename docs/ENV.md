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
| `VITE_SERVER_URL` | No | Backend API base origin; falls back to `window.SERVER_URL` (injected by `startup.sh`) if unset | `http://localhost:5001` |
| `VITE_API_BASE_URL` | No | Full API base URL used by the client's API calls | `http://localhost:5001/api` |

<!-- /AUTO-GENERATED -->
