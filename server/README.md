# ShareAndCopy Server

The backend for ShareAndCopy, built with Express, Socket.IO, and MongoDB.

## Setup

Install dependencies:

```bash
cd server
npm install
```

## Environment variables

<!-- AUTO-GENERATED: from server/.env.example -->
Copy `server/.env.example` to `server/.env` and fill in the required values:

```env
# Required
MONGO_URI=mongodb://localhost:27017/shareandcopy
JWT_SECRET=replace-with-a-long-random-string
JWT_REFRESH_SECRET=replace-with-a-different-long-random-string

# Optional
PORT=5000
NODE_ENV=development
PUBLIC_URL=

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# TURN (WebRTC relay). TURN_SECRET becomes required if TURN_URL is set.
TURN_URL=
TURN_SECRET=
TURN_USER=user

# Prometheus /metrics scrape auth. Endpoint 404s if unset.
METRICS_TOKEN=

# seeder.js only; refuses to run in production regardless.
SEED_PASSWORD=
```

`PUBLIC_URL` should point to the frontend host used for CORS in production. For local development, set `PORT=5001` to match `startup.sh` and the client's default `VITE_SERVER_URL`.
<!-- /AUTO-GENERATED -->

## Development

Run the server in development mode:

```bash
npm run dev
```

## Production

Start the server in production mode:

```bash
npm start
```

## API endpoints

<!-- AUTO-GENERATED: from server/src/routes -->
* `POST /api/auth/register` — create an account
* `POST /api/auth/login` — sign in
* `POST /api/auth/pairing-code` — auth required; issue a short-lived code to pair another device
* `POST /api/auth/verify-pairing` — exchange a pairing code for a pairing token
* `POST /api/auth/adopt-token` — exchange a guest/pairing token for auth cookies
* `POST /api/auth/logout` — auth required
* `POST /api/auth/revoke` — auth required; revoke a device/session
* `GET /api/auth/verify` — auth required
* `POST /api/auth/refresh` — refresh the access token
* `GET /api/admin/stats` — auth + admin required
* `GET /api/system/ip` — server IP info
* `GET /api/system/webrtc-config` — ICE/TURN server config for WebRTC
* `GET /metrics` — Prometheus metrics; requires `Authorization: Bearer <METRICS_TOKEN>` if `METRICS_TOKEN` is set, otherwise 404s
<!-- /AUTO-GENERATED -->

## Notes

* The server connects to MongoDB; there is no Redis dependency.
* CORS is restricted to trusted origins.
* The API is designed for secure deployment with rate limiting and helmet headers.
