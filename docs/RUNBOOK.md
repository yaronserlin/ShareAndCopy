# Runbook

## Deployment

There is no Dockerfile, docker-compose, or CI/CD pipeline in this repo — deployment is manual.

**Server:**

```bash
cd server
npm install
# ensure server/.env has MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET, PUBLIC_URL set for the target environment
npm start   # node src/index.js
```

The server binds to `0.0.0.0` on `PORT` (default `5000`). Set `NODE_ENV=production`.

**Client:**

```bash
cd client
npm run build   # outputs to client/dist
```

Serve `client/dist` behind whatever static host/CDN/reverse-proxy is in front of it (`client/nginx.conf` is provided as a reference config). Point it at the deployed server via `VITE_SERVER_URL` / `VITE_API_BASE_URL` at build time.

**Local orchestration** (`./startup.sh`) is for development only — it is not a production deploy mechanism:

* `--local` — both services on localhost
* `--localnet` — both services bound to the machine's LAN IP (default, via `npm start`)
* `--net` — adds a Cloudflare quick tunnel (requires `cloudflared` on PATH)

## Health checks and monitoring

* No dedicated `/health` endpoint exists. `GET /api/system/ip` and `GET /api/system/webrtc-config` are unauthenticated and can double as liveness checks.
* `GET /metrics` exposes Prometheus metrics (`prom-client`). It requires `Authorization: Bearer <METRICS_TOKEN>` when `METRICS_TOKEN` is set in the server env; if unset, the endpoint 404s (effectively disabled) — set it in any environment you want scraped.
* Application logs are written via `winston` (`server/src/utils/logger.js`); `startup.sh` also tees dev output to `server.log` / `client.log` / `cloudflared.log` in local mode (cleaned up on shutdown).

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Server exits immediately with "Missing required environment variables" | `MONGO_URI` or `JWT_SECRET` unset (or `TURN_SECRET` unset while `TURN_URL` is set) | Set the missing var(s) in `server/.env`; see [ENV.md](./ENV.md) |
| Client can't reach the API | `VITE_SERVER_URL` / `VITE_API_BASE_URL` point at the wrong host, or CORS `PUBLIC_URL` on the server doesn't match the client's origin | Align `PUBLIC_URL` (server) with the client's actual origin |
| `/metrics` returns 404 | `METRICS_TOKEN` not set | Set `METRICS_TOKEN` in `server/.env` |
| `/metrics` returns 401 | Wrong or missing bearer token | Send `Authorization: Bearer <METRICS_TOKEN>` |
| Pairing code / QR pairing fails or expires immediately | Pairing codes are short-lived (5 minutes) and single-use (`server/src/utils/pairingStore.js`) | Generate a new code via `POST /api/auth/pairing-code` |
| `--net` mode never gets a tunnel URL | `cloudflared` not installed or blocked from reaching Cloudflare | Verify `cloudflared` is installed and check `cloudflared.log` |
| WebRTC/P2P connection fails across networks | No TURN server configured (`TURN_URL`/`TURN_SECRET` unset) | Configure a TURN relay; STUN-only setups can fail behind symmetric NAT |

## Rollback

There is no automated deploy/release pipeline, so rollback is git- and process-manager-driven:

1. Identify the last known-good commit: `git log --oneline`.
2. On the server host, check out that commit (or redeploy the corresponding build artifact) and restart the Node process.
3. Rebuild and redeploy `client/dist` from the same commit if the frontend was affected.
4. If a schema/data change shipped in the bad release, check `server/seeder.js` and any recent migration-like scripts before rolling back data — this repo has no formal migration tool, so verify manually.

## Escalation

This repo has no on-call rotation, alerting integration, or issue tracker configured. Until one is set up:

* Treat `winston` logs and `/metrics` as the primary signal sources.
* Escalate by contacting the maintainer directly with the relevant log excerpt and the commit/environment affected.
