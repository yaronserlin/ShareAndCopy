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

## License
ISC
