# Contributing to ShareAndCopy

## Prerequisites

* Node.js and npm
* A running MongoDB instance (local or remote) for `MONGO_URI`
* `cloudflared` — only needed for `npm run net` (tunnel mode)

## Setup

```bash
git clone <repo-url>
cd ShareAndCopy
cd client && npm install
cd ../server && npm install
```

Copy the environment templates and fill in required values:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

See [ENV.md](./ENV.md) for what each variable does.

Start both services from the repo root:

```bash
npm start   # bash ./startup.sh --localnet
```

## Available scripts

<!-- AUTO-GENERATED: from package.json files -->
### Root (`package.json`)

| Command | Description |
|---------|-------------|
| `npm start` | `bash ./startup.sh --localnet` — start client + server on the local network |
| `npm run local` | `bash ./startup.sh --local` — start client + server on localhost only |
| `npm run localnet` | Same as `npm start` |
| `npm run net` | `bash ./startup.sh --net` — start with a Cloudflare tunnel (requires `cloudflared`) |

### `client/package.json`

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build (output to `client/dist`) |
| `npm run lint` | Run ESLint over the client source |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run the Vitest suite |

### `server/package.json`

| Command | Description |
|---------|-------------|
| `npm start` | Run the server with plain `node` (production) |
| `npm run dev` | Run the server with `nodemon` (auto-restart) |
| `npm test` | Run the Jest suite |
| `npm run seed` | Run `seeder.js` to seed the database (refuses to run when `NODE_ENV=production`) |
| `npm run generate-vapid` | Print a fresh VAPID key pair for Web Push (see [ENV.md](./ENV.md)) |
<!-- /AUTO-GENERATED -->

## Testing

* **Client** (Vitest + React Testing Library + jsdom): tests live beside the code they cover, in a `__tests__/` folder per feature/component (e.g. `client/src/components/__tests__/Home.test.jsx`, `client/src/hooks/__tests__/useP2P.test.jsx`). Run with `cd client && npm test`.
* **Server** (Jest + Supertest + `mongodb-memory-server`): tests live in the flat `server/__tests__/` directory (e.g. `auth.test.js`, `admin.test.js`, `signaling.test.js`), with `testDb.js` providing a shared in-memory MongoDB helper. Run with `cd server && npm test`.

When adding a feature, add or update the corresponding test file following the existing convention for that module rather than introducing a new test layout.

## Code style

* The client is linted with ESLint (`client/eslint.config.js`, flat config) — run `npm run lint` in `client/` before committing. Rules cover the React Hooks plugin and Vite's fast-refresh plugin.
* The server has no linter configured; match the existing style in the file you're editing.
* There are no pre-commit hooks or CI workflows configured in this repo — run lint/tests locally before opening a PR.

## PR checklist

- [ ] `npm run lint` passes (client)
- [ ] `npm test` passes in both `client/` and `server/`
- [ ] New/changed env vars are added to both `.env.example` files and documented in [ENV.md](./ENV.md)
- [ ] New/changed API routes are reflected in the server README's endpoint list
- [ ] No secrets or `.env` files committed
