# ShareAndCopy Server

The backend for ShareAndCopy, built with Express, Socket.IO, MongoDB, and optional Redis support.

## Setup

Install dependencies:

```bash
cd server
npm install
```

## Environment variables

Create `server/.env` with the following values:

```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/shareandcopy
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
NODE_ENV=development
PUBLIC_URL=http://localhost:5173
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

`PUBLIC_URL` should point to the frontend host used for CORS in production.

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

* `POST /api/auth/register`
* `POST /api/auth/login`
* `GET /api/auth/verify`
* `GET /api/admin/stats`
* `GET /api/system/status`
* `GET /metrics`

## Notes

* The server connects to MongoDB and initializes Redis if configured.
* CORS is restricted to trusted origins.
* The API is designed for secure deployment with rate limiting and helmet headers.
