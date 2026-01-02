# CodeWithMe API Documentation

## Base URL

```
http://localhost:4000/api/v1
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "status": "success",
  "token": "jwt-token-here",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

### Sessions

#### List Sessions
```http
GET /sessions
Authorization: Bearer <token>
```

#### Get Session
```http
GET /sessions/:id
Authorization: Bearer <token>
```

#### Create Session
```http
POST /sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Frontend Interview",
  "description": "Interview description",
  "problem_statement": "Problem statement here",
  "scheduled_at": "2024-01-01T10:00:00Z",
  "duration_minutes": 60
}
```

#### Update Session
```http
PATCH /sessions/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "active"
}
```

#### Delete Session
```http
DELETE /sessions/:id
Authorization: Bearer <token>
```

### Recording

#### Start Recording
```http
POST /sessions/:id/recording
Authorization: Bearer <token>
```

#### Stop Recording
```http
DELETE /sessions/:id/recording
Authorization: Bearer <token>
```

#### Get Recording
```http
GET /sessions/:id/recording
Authorization: Bearer <token>
```

#### Record Event
```http
POST /sessions/:id/recording/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "event_type": "code_change",
  "event_data": {
    "content": "code here",
    "language": "javascript"
  }
}
```

### Plagiarism

#### Check Plagiarism
```http
POST /sessions/:id/plagiarism
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "function solution() { ... }",
  "language": "javascript"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "check": {
      "id": "uuid",
      "session_id": "uuid",
      "similarity_score": 85.5,
      "matches": [
        {
          "source": "Previous submission",
          "similarity": 85.5,
          "snippet": "code snippet..."
        }
      ],
      "checked_at": "2024-01-01T10:00:00Z"
    }
  }
}
```

#### Get Plagiarism Checks
```http
GET /sessions/:id/plagiarism
Authorization: Bearer <token>
```

### Snapshots

#### Create Snapshot
```http
POST /sessions/:id/snapshots
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "code content",
  "language": "javascript",
  "message": "Checkpoint 1"
}
```

#### List Snapshots
```http
GET /sessions/:id/snapshots
Authorization: Bearer <token>
```

#### Get Snapshot
```http
GET /sessions/:id/snapshots/:index
Authorization: Bearer <token>
```

## Error Responses

All errors follow this format:

```json
{
  "status": "error",
  "message": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Invalid input
- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource conflict
- `INTERNAL_ERROR` (500): Server error

## WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:4000', {
  auth: { token: 'jwt-token' }
});
```

### Events

#### Join Session
```javascript
socket.emit('join-session', {
  sessionId: 'session-id',
  username: 'John Doe'
});
```

#### Chat Message
```javascript
socket.emit('chat-message', {
  text: 'Hello!'
});

socket.on('chat-message', (message) => {
  console.log(message);
});
```

#### Code Execution
```javascript
socket.emit('run-code', {
  language: 'javascript',
  code: 'console.log("Hello");',
  sessionId: 'session-id'
});

socket.on('run-result', (result) => {
  console.log(result);
});
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse. Limits:
- Authentication: 5 requests per minute
- General API: 100 requests per minute

