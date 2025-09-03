# Shift Management App

A full-stack application for managing user shifts and blocked time slots with calendar visualization.

## Features

- User shift management (day, from time, to time)
- Block specific time ranges
- Calendar view with visual indicators
- MongoDB data persistence
- Token-based authentication

## Backend Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server with MongoDB Atlas:
```bash
npm run dev
```

Or for demo mode (no MongoDB required):
```bash
npm run demo
```

The server will run on http://localhost:3000

## Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the Angular development server:
```bash
ng serve --port 4200
```

The frontend will run on http://localhost:4200

## API Endpoints

### Authentication
All API calls require the header: `Authorization: Bearer mytoken`

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user

### Shifts
- `POST /api/shifts` - Create a new shift
- `GET /api/shifts/:userId` - Get shifts for a user
- `DELETE /api/shifts/:id` - Delete a shift

### Blocked Times
- `POST /api/blocked` - Create a blocked time slot
- `GET /api/blocked/:userId` - Get blocked times for a user
- `DELETE /api/blocked/:id` - Delete a blocked time slot

### Calendar
- `GET /api/calendar/:userId` - Get combined calendar data (shifts + blocked times)

## Initial Setup

1. Start the backend server
2. Create a user manually in the database or use the API
3. Use the frontend to manage shifts and blocked times
