# ShareAndCopy

ShareAndCopy is a secure, ephemeral file-sharing web application. It allows users to upload files to a "room," share them via a link or QR code, and automatically cleans up files after a set period.

## Architecture

The project is divided into two main components:

*   **[Server](./server/README.md)**: A Node.js/Express backend that handles file storage (GridFS), encryption management, and API requests.
*   **[Client](./client/README.md)**: A React-based frontend that provides a user-friendly interface for uploading, downloading, and managing shared files.

## Quick Start

To run the entire application locally, you will need two terminal windows.

### 1. Start the Server
Navigate to the `server` directory, install dependencies, and start the server.

```bash
cd server
npm install
npm run dev
```
The server will start on port `5001` (by default).

### 2. Start the Client
In a new terminal, navigate to the `client` directory, install dependencies, and launch the frontend.

```bash
cd client
npm install
npm run dev
```
The client will typically start on `http://localhost:5173`.

## Documentation

For detailed instructions on configuration, environment variables, and deployment, please refer to the specific README files in each directory:

*   [Server Documentation](./server/README.md)
*   [Client Documentation](./client/README.md)

## Render Deployment

This app can be deployed on Render with two services:

1. **Server**: a Docker web service using `server/Dockerfile`.
2. **Client**: a static site or Docker service using the `client` directory.

### Required environment variables for the backend

* `MONGO_URI`
* `JWT_SECRET`
* `JWT_REFRESH_SECRET`
* `PUBLIC_URL` (set to the client URL, e.g. `https://your-client.onrender.com`)
* `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` (optional; Redis fallback is used if unset)

### Client build variables

* `VITE_SERVER_URL` should point to your Render backend URL, e.g. `https://your-server.onrender.com`

### Recommended Render service configuration

* Server: Docker service with `server/Dockerfile`
* Client: Static site service with root directory `client`, build command `npm install && npm run build`, and publish directory `dist`

## License
ISC
