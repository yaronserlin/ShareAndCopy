# ShareAndCopy - Client

The frontend interface for ShareAndCopy, a modern, secure file-sharing application designed for ease of use. Built with React and Vite.

## Features
- **Modern UI**: Clean, responsive interface built with Bootstrap and custom CSS.
- **Real-time Interaction**: Instant feedback on file uploads and room activities.
- **Client-Side Encryption**: Ensures files are encrypted before leaving your browser (feature in progress).
- **QR Code Sharing**: Easily share room links via QR codes.

## Tech Stack
- **Framework**: React (Vite)
- **Styling**: Bootstrap 5, Bootstrap Icons, Custom CSS
- **HTTP Client**: Axios
- **Routing**: React Router DOM

## Prerequisites
- Node.js (v18+ recommended)

## Installation

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

Create a `.env` file in the `client` root directory (or use `.env.local`):

```env
# API Configuration
# Optional: Set this if your server is not running on localhost:5001 or for production builds.
VITE_API_URL=http://localhost:5001/api
```

 If `VITE_API_URL` is omitted, the application will attempt to dynamically determine the API URL based on the current window location and port 5001.

## Usage

### Development Mode
Starts the development server with Hot Module Replacement (HMR):
```bash
npm run dev
```
Access the app at `http://localhost:5173` (or the port shown in terminal).

### Production Build
Builds the app for production:
```bash
npm run build
```
Preview the production build:
```bash
npm run preview
```

## Structure
- `src/assets`: Static assets like images and styles.
- `src/components`: Reusable UI components (Navbar, Footer, etc.).
- `src/config.js`: App configuration.
- `src/constants`: Application constants.
- `src/context`: React Context Providers (AuthContext, etc.).
- `src/features`: Feature-based modules (Auth, Room, etc.).
- `src/hooks`: Custom React hooks.
- `src/pages`: Main application views (Home, Room, etc.).
- `src/services`: API handling and external service logic.
- `src/utils`: Helper functions and validators.
