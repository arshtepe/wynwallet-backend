# WyWallet Backend API

Backend API server for the WyWallet mobile application built with Node.js and Express.

## Features

- Auth0 JWT authentication
- User profile management (personal info, address)
- Receipt scanning and storage
- Recent wins tracking
- App version checking
- SQLite database for data persistence

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file from `env.example`:
```bash
cp env.example .env
```

3. Configure your `.env` file with your settings:
```env
PORT=3000
AUTH0_DOMAIN=dev-ijjyierp1cvlyen2.us.auth0.com
AUTH0_AUDIENCE=https://api.wywallet.com

# PostgreSQL Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=wywallet
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password_here
POSTGRES_SSL=false
```

**Important**: 
- All database credentials are loaded from the `.env` file or environment variables
- Make sure your Auth0 API has the same audience configured. You can set this in your Auth0 Dashboard under APIs
- Ensure PostgreSQL is running and accessible with the provided credentials
- Set `POSTGRES_SSL=true` for production environments that require SSL

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## API Endpoints

### Authentication
All endpoints except `/app/version-check` require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-auth0-access-token>
```

### User Endpoints

#### GET `/user/signup-status`
Check if the user has completed signup (personal info + address).

**Response:**
```json
{
  "signupCompleted": true
}
```

#### POST `/user/personal-info`
Submit personal information.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "dateOfBirth": "1990-01-01",
  "email": "john@example.com",
  "phone": "+1234567890"
}
```

#### POST `/user/address`
Submit address information.

**Request Body:**
```json
{
  "streetAddress": "123 Main St",
  "building": "Apt 4B",
  "apartment": "4B",
  "zip": "12345",
  "city": "New York",
  "stateRegion": "NY"
}
```

### Receipt Endpoints

#### POST `/receipts/scan`
Submit a scanned receipt (QR code).

**Request Body:**
```json
{
  "qrData": "QR123456"
}
```

#### GET `/receipts`
Get all receipts for the authenticated user.

**Response:**
```json
{
  "receipts": [
    {
      "id": "uuid",
      "qrData": "QR123456",
      "scannedAt": "2024-01-01T00:00:00.000Z",
      "amount": 25.50,
      "merchant": "Store Name"
    }
  ]
}
```

### App Endpoints

#### POST `/app/version-check`
Check if the app version is deprecated (no auth required).

**Request Body:**
```json
{
  "appVersion": "1.0.0",
  "buildNumber": "1",
  "platform": "ios",
  "osVersion": "17.0",
  "deviceId": "unique-device-id"
}
```

**Response:**
```json
{
  "deprecated": false,
  "minVersion": "0.0.1",
  "updateUrl": "https://apps.apple.com/app/id123456789",
  "message": "Please update to the latest version..."
}
```

### Wins Endpoints

#### GET `/wins/recent`
Get recent wins (last 10 by default).

**Query Parameters:**
- `limit` (optional): Number of wins to return (default: 10)

**Response:**
```json
{
  "wins": [
    {
      "id": "uuid",
      "userId": "user-uuid",
      "userName": "John Doe",
      "amount": 100.00,
      "wonAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Database

The API uses **PostgreSQL** for data storage with **Drizzle ORM** for type-safe database queries. All database credentials are loaded from environment variables.

### Database Schema

The database schema is defined in `db/schema.js` using Drizzle ORM. The schema includes:

- **users**: Stores Auth0 user IDs
- **personal_info**: User personal information
- **addresses**: User addresses
- **receipts**: Scanned receipts
- **wins**: User wins/prizes

### Database Migrations

The database uses Drizzle migrations for schema management. Migrations are automatically applied when the server starts.

**First-time setup:**

1. Generate migrations from your schema:
```bash
npm run db:generate
```

2. Start the server - migrations will be applied automatically:
```bash
npm start
```

**After schema changes:**

1. Update `db/schema.js` with your changes
2. Generate new migrations:
```bash
npm run db:generate
```
3. Restart the server to apply migrations

**Alternative: Push schema directly (development only):**

For quick development iterations, you can push schema changes directly without generating migrations:

```bash
npm run db:push
```

**Open Drizzle Studio (database GUI):**

```bash
npm run db:studio
```

**Note**: Migrations are automatically applied on server startup. Make sure to generate migrations after schema changes.

## Development

### Project Structure

```
backend/
├── db/
│   ├── schema.js        # Drizzle ORM schema definitions
│   ├── database.js      # Database initialization and connection
│   └── migrations/     # Database migrations (generated)
├── middleware/
│   └── auth.js          # Auth0 JWT verification middleware
├── routes/
│   ├── user.js          # User-related endpoints
│   ├── receipts.js      # Receipt endpoints
│   ├── app.js           # App version check endpoint
│   └── wins.js          # Wins endpoints
├── drizzle.config.js    # Drizzle Kit configuration
├── server.js            # Express server setup
├── .env.example         # Environment variables template
└── package.json
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `AUTH0_DOMAIN`: Your Auth0 domain
- `AUTH0_AUDIENCE`: Auth0 API audience identifier
- `POSTGRES_HOST`: PostgreSQL host (default: localhost)
- `POSTGRES_PORT`: PostgreSQL port (default: 5432)
- `POSTGRES_DB`: PostgreSQL database name
- `POSTGRES_USER`: PostgreSQL username
- `POSTGRES_PASSWORD`: PostgreSQL password
- `POSTGRES_SSL`: Enable SSL connection (true/false, default: false)
- `IOS_UPDATE_URL`: iOS app update URL (optional)
- `ANDROID_UPDATE_URL`: Android app update URL (optional)

## Notes

- The database is automatically initialized on server start
- Users are automatically created when they first authenticate
- All timestamps are stored in ISO 8601 format
- The API uses Auth0's RS256 algorithm for JWT verification
- The codebase uses **Drizzle ORM** for type-safe database queries
- All database operations are asynchronous (PostgreSQL)
- Schema changes should be made in `db/schema.js` and migrations generated with `npm run db:generate`
- PostgreSQL connection is established using credentials from environment variables

