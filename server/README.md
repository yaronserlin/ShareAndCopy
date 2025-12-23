# ShareAndCopy Server

This is the backend server for the ShareAndCopy application, built with Node.js, Express, and MongoDB.

## Architecture

- **Models**: Mongoose schemas only.
- **Routes**: Clean route definitions with middleware.
- **Middleware**: Validation, Auth, Error Handling.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the `server` directory (or ensure it exists) with:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/shareandcopy
   JWT_SECRET=your_jwt_secret_key_here
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX_REQUESTS=100
   NODE_ENV=development
   PUBLIC_URL=http://localhost:3000
   ```

3. **Run Server**
   - **Development**: `npm run dev`
   - **Production**: `npm start`

## API Documentation

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verify token

### Files
- `POST /api/files/upload` - Upload file (Multipart)
- `GET /api/files/room/:roomId` - List files
- `GET /api/files/download/:fileId` - Download file
- `GET /api/files/room/:roomId/download-all` - Download all as ZIP
- `PUT /api/files/:id/rename` - Rename file
- `DELETE /api/files/:id` - Delete file

### Admin
- `GET /api/admin/stats` - Dashboard statistics

## Security Features
- **Rate Limiting**: Protects against brute-force.
- **Helmet**: Secure HTTP headers.
- **Data Sanitization**: Prevents NoSQL injection (implemented in middleware).
- **Validation**: Strict Joi validation for inputs.
