# ShareAndCopy

ShareAndCopy is a secure file-sharing platform built with React, Bootstrap, Node.js, Express, MongoDB, Redis, and Socket.IO.

## Overview

The application is split into two deployable modules:

* **Client** — React + Vite frontend with Bootstrap styling.
* **Server** — Express backend with REST APIs, Socket.IO, and MongoDB persistence.

## Local development

1. Install dependencies for both modules:

```bash
cd client && npm install
cd ../server && npm install
```

2. Start the application from the repository root:

```bash
npm start
```

This runs `startup.sh --localnet`, starting the backend and frontend together.

## Available start modes

* `npm start` or `bash ./startup.sh --localnet` — start both services on the local network.
* `bash ./startup.sh --local` — start both services locally.
* `bash ./startup.sh --net` — start with a Cloudflare tunnel when `cloudflared` is installed.

## Deployment

### Client

Build the frontend for production:

```bash
cd client
npm run build
```

The build output is published to `client/dist`.

### Server

Prepare the backend for production:

```bash
cd server
npm install
npm start
```

### Environment variables

Required backend variables:

* `PORT` — server port, default `5001`
* `MONGO_URI` — MongoDB connection string
* `JWT_SECRET` — JWT signing secret
* `JWT_REFRESH_SECRET` — refresh token secret
* `PUBLIC_URL` — public client URL for CORS and app links
* `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` — optional Redis connection

Required frontend variables:

* `VITE_SERVER_URL` — server base URL used by the client

## Project structure

* `client/` — frontend React application
* `server/` — backend API and socket service
* `startup.sh` — development orchestration script

## Notes

The repository now uses a clean root package entrypoint and no unnecessary root dependencies. All React and Node source files were cleaned of stale comments and are annotated with new file-level preview headers.
