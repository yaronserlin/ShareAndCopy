# ShareAndCopy - Server

The backend service for ShareAndCopy, a secure file sharing application. Built with Express.js and MongoDB.

## Features
- **Secure File Upload**: Files are encrypted (client-side) and stored using MongoDB GridFS.
- **Auto-Cleanup**: Automated cron jobs delete expired files.
- **Security**: Implements Helmet, Rate Limiting, and CORS protection.
- **Authentication**: JWT-based authentication for user sessions.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose, GridFS)
- **Logging**: Winston

## Prerequisites
- Node.js (v18+ recommended)
- MongoDB instance (Local or Atlas)

## Installation

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

Create a `.env` file in the `server` root directory:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/shareandcopy

# Security
JWT_SECRET=your_super_secret_jwt_key
```

## Usage

### Development Mode
Runs the server with `nodemon` for hot-reloading:
```bash
npm run dev
```

### Production Mode
Starts the server with standard node execution:
```bash
npm start
```

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/files/:roomId` | List files in a room |
| POST | `/api/files/upload` | Upload a file |
| GET | `/api/files/download/:fileId` | Download a file |
| DELETE | `/api/files/:id` | Delete a file |

## Scripts
- `npm test`: Run tests using Jest.
- `npm run dev`: Start development server.
