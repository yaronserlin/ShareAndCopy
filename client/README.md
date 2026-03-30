# ShareAndCopy - Client

The frontend for ShareAndCopy, built with React, Vite, Bootstrap 5, and React Bootstrap.

## Setup

Install dependencies:

```bash
cd client
npm install
```

## Environment

Create `.env` or `.env.local` in the `client` folder to override the backend URL:

```env
VITE_SERVER_URL=http://localhost:5001
```

If `VITE_SERVER_URL` is not provided, the client uses `window.SERVER_URL` if available.

## Development

Run the development server:

```bash
npm run dev
```

Open the application at `http://localhost:5173`.

## Production

Build the optimized production bundle:

```bash
npm run build
```

Preview the production output:

```bash
npm run preview
```

## Structure

* `src/` — React application source
* `src/components/` — reusable UI components
* `src/features/` — feature modules
* `src/context/` — React providers
* `src/hooks/` — custom hooks
* `src/utils/` — helper utilities
* `public/` — static assets

## Notes

The frontend now imports Bootstrap styles at the application entrypoint and is configured for deployment with the root `startup.sh` orchestrator.
