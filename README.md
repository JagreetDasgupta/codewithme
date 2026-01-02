# CodeWithMe - Real-time Collaborative Coding Interview Platform

<div align="center">

![CodeWithMe](https://img.shields.io/badge/CodeWithMe-v2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![React](https://img.shields.io/badge/React-18.2-61dafb)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791)
![Redis](https://img.shields.io/badge/Redis-7+-dc382d)

**A production-ready, cloud-native SaaS platform for conducting remote technical interviews with real-time collaborative coding, WebRTC video/audio communication, intelligent proctoring, and seamless code execution.**

[Features](#-features) • [Architecture](#-architecture) • [Installation](#-installation) • [Configuration](#-configuration) • [API Reference](#-api-reference) • [WebSocket Events](#-websocket-events) • [Troubleshooting](#-troubleshooting)

</div>

---

## 📋 Table of Contents

- [Features](#-features)
  - [Real-time Collaboration](#-real-time-collaboration)
  - [Video & Audio Communication](#-video--audio-communication)
  - [Code Execution](#-code-execution)
  - [Session Management](#-session-management)
  - [Security & Proctoring](#-security--proctoring)
- [Architecture](#-architecture)
  - [System Overview](#system-overview)
  - [Technology Stack](#technology-stack)
  - [Data Flow](#data-flow)
- [Installation](#-installation)
  - [Prerequisites](#prerequisites)
  - [Quick Start](#quick-start)
  - [Development Setup](#development-setup)
  - [Production Deployment](#production-deployment)
- [Configuration](#-configuration)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Redis Configuration](#redis-configuration)
- [API Reference](#-api-reference)
- [WebSocket Events](#-websocket-events)
- [Frontend Components](#-frontend-components)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## ✨ Features

### 🎨 Real-time Collaboration

#### Monaco Editor Integration
The platform uses **Monaco Editor** - the same editor that powers VS Code - providing a professional IDE experience directly in the browser:

- **IntelliSense**: Auto-completion for 25+ languages
- **Syntax Highlighting**: Full syntax highlighting with customizable themes
- **Error Detection**: Real-time error highlighting and diagnostics
- **Code Folding**: Collapse/expand code sections
- **Multi-cursor Editing**: Edit multiple lines simultaneously
- **Find & Replace**: Powerful search with regex support
- **Minimap**: Visual overview of the entire file
- **Custom Themes**: Light and dark theme support

#### CRDT-based Collaboration (Yjs)
Real-time collaborative editing is powered by **Yjs**, a high-performance CRDT (Conflict-free Replicated Data Type) framework:

- **Operational Transform-free**: No conflicts, ever. Changes merge automatically
- **Offline Support**: Continue editing offline, sync when reconnected
- **Cursor Awareness**: See other users' cursors and selections in real-time
- **Undo/Redo**: Per-user undo history that respects concurrent edits
- **Performance**: Handles documents with 100,000+ operations efficiently

#### Supported Programming Languages

| Category | Languages |
|----------|-----------|
| **Web** | JavaScript, TypeScript, HTML, CSS, PHP, Dart |
| **Systems** | C, C++, Java, C#, Go, Rust, Swift, Kotlin |
| **Scripting** | Python, Ruby, Bash, Perl, Lua |
| **Functional** | Haskell, Scala, Elixir, F# |
| **Data** | SQL, R, JSON, YAML, XML |
| **Other** | Assembly, COBOL, Fortran |

### 🎥 Video & Audio Communication

#### WebRTC Implementation
Peer-to-peer video and audio communication using **SimplePeer** for WebRTC abstraction:

```
┌─────────────┐                           ┌─────────────┐
│    Host     │ ◄─── WebRTC Media ───►   │ Participant │
│  (Browser)  │                           │  (Browser)  │
└──────┬──────┘                           └──────┬──────┘
       │                                         │
       │         ┌─────────────────┐            │
       └────────►│ Signaling Server │◄───────────┘
                 │   (Socket.IO)    │
                 └─────────────────┘
```

**Features:**
- **Peer-to-Peer**: Direct connection between participants (no media servers needed)
- **Signal Buffering**: Handles signals arriving before stream is ready
- **Auto-reconnection**: Automatically reconnects if connection is lost
- **Mute/Unmute**: Toggle audio with single click
- **Camera Toggle**: Turn video on/off without disconnecting
- **Speaking Indicator**: Visual indicator when someone is speaking
- **Picture-in-Picture**: Minimize video to corner of screen

#### Waiting Room
Host-controlled admission system:
- Participants wait in a lobby before being admitted
- Host sees list of waiting participants
- Option to admit or reject each participant
- Auto-admit toggle for trusted sessions
- Custom waiting room message

### 🖥️ Code Execution

#### Sandbox Architecture
Secure, isolated code execution using Docker containers:

```
┌──────────────────────────────────────────────────────────────┐
│                      Sandbox Service                          │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Container  │  │  Container  │  │  Container  │   ...    │
│  │  (Python)   │  │   (Java)    │  │    (C++)    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                               │
│  • 10s timeout per execution                                  │
│  • 128MB memory limit                                         │
│  • No network access                                          │
│  • Read-only filesystem                                       │
│  • Unprivileged user                                          │
└──────────────────────────────────────────────────────────────┘
```

**Security Features:**
- **Resource Limits**: CPU, memory, and time limits per execution
- **Network Isolation**: Containers cannot access the network
- **Filesystem Isolation**: Read-only root filesystem
- **User Isolation**: Code runs as unprivileged user
- **Cleanup**: Containers are destroyed after execution

**Fallback Languages (when sandbox unavailable):**
When running in development without Docker, the system provides fallback language support for frontend display.

### 📊 Session Management

#### Dashboard Features
- **Create Session**: Quick-create with title, description, and language
- **Join Session**: Enter session ID or paste invite link
- **Session Cards**: Visual overview of all your sessions
- **Invite Links**: One-click copy of shareable session URLs
- **Delete Session**: Remove sessions with confirmation
- **Session History**: View past sessions and their details

#### In-Session Features
- **Problem Statement Pane**: Rich text problem description
- **File Tree**: Multi-file support with add/rename/delete
- **Code Snapshots**: Save and restore code states
- **Output Console**: View execution results with syntax highlighting
- **Activity Log**: Timestamped log of all session events
- **Participant List**: See who's in the session
- **Chat**: Real-time text chat between participants

### 🔒 Security & Proctoring

#### Authentication
- **JWT-based Auth**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable salt rounds
- **Token Expiration**: Configurable token lifetime
- **Refresh Tokens**: Seamless session renewal

#### Session Security
- **Session Passwords**: Optional password protection
- **Host-only Controls**: Certain actions restricted to host
- **Admission Control**: Waiting room for participant vetting
- **Rate Limiting**: Protect against abuse

#### Proctoring Capabilities
- **Tab Switch Detection**: Log when user leaves the tab
- **Copy/Paste Monitoring**: Track clipboard operations
- **Focus Events**: Track window focus changes
- **Activity Timeline**: Complete event history

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  FRONTEND                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         React Application                            │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │    │
│  │  │   Monaco    │  │   Video     │  │    Chat     │  │  Dashboard │  │    │
│  │  │   Editor    │  │   Panel     │  │   Panel     │  │            │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│              ┌───────────────┼───────────────┐                              │
│              │               │               │                              │
│              ▼               ▼               ▼                              │
│        HTTP REST        WebSocket       WebRTC P2P                          │
└─────────────────────────────────────────────────────────────────────────────┘
                  │               │
                  ▼               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  BACKEND                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Express Server                               │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │    │
│  │  │    Auth     │  │   Session   │  │   Socket    │  │    Yjs     │  │    │
│  │  │   Routes    │  │   Routes    │  │   Handler   │  │   Server   │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│              │                   │                   │                       │
│              ▼                   ▼                   ▼                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────┐           │
│  │   PostgreSQL    │  │      Redis      │  │    Sandbox (Docker)│           │
│  │   (Primary DB)  │  │  (Cache/Pubsub) │  │  (Code Execution)  │           │
│  └─────────────────┘  └─────────────────┘  └────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend (Port 3000)

| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Framework | 18.2+ |
| TypeScript | Type Safety | 5.3+ |
| Vite | Build Tool | 4.5+ |
| Monaco Editor | Code Editor | Latest |
| Yjs | CRDT Collaboration | 13+ |
| y-websocket | Yjs WebSocket Provider | Latest |
| Socket.IO Client | Real-time Communication | 4.6+ |
| SimplePeer | WebRTC Abstraction | 9.11+ |
| styled-components | CSS-in-JS | 6+ |
| React Router | Navigation | 6+ |
| Axios | HTTP Client | 1.6+ |
| react-icons | Icon Library | 5+ |

#### Backend (Port 4000)

| Technology | Purpose | Version |
|------------|---------|---------|
| Node.js | Runtime | 18+ |
| Express | Web Framework | 4.18+ |
| TypeScript | Type Safety | 5.3+ |
| Socket.IO | WebSocket Server | 4.6+ |
| y-websocket | Yjs Server | Latest |
| JWT (jsonwebtoken) | Authentication | 9+ |
| bcryptjs | Password Hashing | 2.4+ |
| pg | PostgreSQL Client | 8.11+ |
| ioredis | Redis Client | 5+ |
| Winston | Logging | 3.11+ |
| Helmet | Security Headers | 7+ |
| CORS | Cross-Origin Requests | 2.8+ |
| express-rate-limit | Rate Limiting | 7+ |
| uuid | ID Generation | 9+ |

#### Database Layer

| Technology | Purpose | Port |
|------------|---------|------|
| PostgreSQL | Primary Database | 5432 |
| Redis | Caching, Sessions, Yjs Persistence | 6379 |

### Data Flow

#### Code Collaboration Flow
```
1. User types in Monaco Editor
2. Monaco fires content change event
3. Yjs captures change and applies to local Y.Doc
4. y-websocket syncs change to server
5. Server broadcasts to all connected clients in session
6. Other clients receive update and apply to their Y.Doc
7. Monaco binding updates editor display
```

#### WebRTC Signaling Flow
```
1. Host joins session, gets local media stream
2. Participant joins session, gets local media stream
3. Server emits 'user-joined' to host
4. Host creates SimplePeer as initiator
5. SimplePeer generates offer signal
6. Host emits 'signal' event with offer
7. Server relays signal to participant
8. Participant creates SimplePeer as non-initiator
9. Participant processes offer, generates answer
10. Answer relayed back to host
11. ICE candidates exchanged
12. Direct P2P connection established
13. Media streams flow directly between peers
```

---

## 🚀 Installation

### Prerequisites

| Requirement | Minimum Version | Notes |
|-------------|-----------------|-------|
| Node.js | 18.0+ | LTS recommended |
| npm | 9.0+ | Or yarn/pnpm |
| PostgreSQL | 14+ | Required for production |
| Redis | 7+ | Required for Yjs sync |
| Docker | 20+ | Optional (for sandbox) |
| Git | 2.0+ | For cloning |

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/codewithme.git
cd codewithme

# 2. Install dependencies for all packages
npm run install:all
# Or manually:
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 3. Set up environment files (see Configuration section)
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials

# 4. Initialize the database
cd backend
npm run db:migrate

# 5. Start development servers

# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm start
```

### Development Setup

#### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL and Redis connection details

# Run database migrations
npm run db:migrate

# Start development server with hot reload
npm run dev

# The server will start on http://localhost:4000
```

#### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# The app will open at http://localhost:3000
```

### Production Deployment

#### Using Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: codewithme
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

  backend:
    build: ./backend
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

```bash
# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

---

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)

```env
# Server Configuration
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=12

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=codewithme
DB_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Code Execution Sandbox
SANDBOX_URL=http://localhost:5000
EXECUTION_TIMEOUT=10000
MAX_CODE_SIZE=100000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EXECUTION_RATE_LIMIT=10

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined

# Optional: Sentry Error Tracking
SENTRY_DSN=

# Optional: File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

#### Frontend (.env)

```env
# API Configuration
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000

# Optional: Analytics
VITE_ANALYTICS_ID=

# Optional: Feature Flags
VITE_ENABLE_VIDEO=true
VITE_ENABLE_CHAT=true
VITE_ENABLE_PROCTORING=false
```

### Database Setup

#### PostgreSQL Schema

The following tables are automatically created by migrations:

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    problem_statement TEXT,
    host_id UUID REFERENCES users(id),
    language VARCHAR(50) DEFAULT 'javascript',
    status VARCHAR(20) DEFAULT 'active',
    password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session participants
CREATE TABLE session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'participant',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assessment results
CREATE TABLE assessment_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id),
    user_id UUID REFERENCES users(id),
    question_id VARCHAR(100),
    code TEXT,
    language VARCHAR(50),
    test_results JSONB,
    total_tests INTEGER,
    passed_tests INTEGER,
    score DECIMAL(5,2),
    max_score DECIMAL(5,2),
    execution_time INTEGER,
    code_quality JSONB,
    feedback JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Proctoring events
CREATE TABLE proctoring_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id),
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(50),
    event_data JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Running Migrations

```bash
cd backend

# Run all pending migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Reset database (drops all tables)
npm run db:reset
```

### Redis Configuration

Redis is used for:
1. **Yjs Document Persistence**: Session code is persisted across reconnections
2. **Code Snapshots**: Save/restore points for code
3. **Session State**: Fast access to active session data
4. **Rate Limiting**: Request counting for rate limiters

```javascript
// Redis key patterns
yjs:${sessionId}         // Yjs document state
snapshots:${sessionId}   // Array of code snapshots
session:${sessionId}     // Session metadata cache
rate:${ip}:${endpoint}   // Rate limit counters
```

---

## 📚 API Reference

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}

Response 201:
{
  "status": "success",
  "data": {
    "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}

Response 200:
{
  "status": "success",
  "data": {
    "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer <token>

Response 200:
{
  "status": "success",
  "data": {
    "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com" }
  }
}
```

### Session Endpoints

#### List Sessions
```http
GET /api/v1/sessions
Authorization: Bearer <token>

Response 200:
{
  "status": "success",
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "title": "Frontend Interview",
        "description": "React developer position",
        "language": "javascript",
        "status": "active",
        "participants": 2,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

#### Create Session
```http
POST /api/v1/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Backend Developer Interview",
  "description": "Node.js position",
  "language": "typescript",
  "password": "optional-password"
}

Response 201:
{
  "status": "success",
  "data": {
    "session": {
      "id": "uuid",
      "title": "Backend Developer Interview",
      "host_id": "user-uuid",
      ...
    }
  }
}
```

#### Get Session Details
```http
GET /api/v1/sessions/:id
Authorization: Bearer <token>

Response 200:
{
  "status": "success",
  "data": {
    "session": {
      "id": "uuid",
      "title": "Backend Developer Interview",
      "host_id": "user-uuid",
      "problem_statement": "...",
      "participants": [...],
      ...
    }
  }
}
```

#### Join Session
```http
POST /api/v1/sessions/join
Authorization: Bearer <token>
Content-Type: application/json

{
  "id": "session-uuid",
  "password": "optional-password"
}

Response 200:
{
  "status": "success",
  "data": {
    "session": { ... }
  }
}
```

#### Delete Session
```http
DELETE /api/v1/sessions/:id
Authorization: Bearer <token>

Response 204: No Content
```

### Code Execution Endpoints

#### Get Available Languages
```http
GET /api/v1/languages

Response 200:
{
  "status": "success",
  "data": {
    "languages": [
      { "id": "javascript", "name": "JavaScript", "version": "ES2022", "icon": "🟨" },
      { "id": "python", "name": "Python", "version": "3.11", "icon": "🐍" },
      ...
    ]
  }
}
```

#### Execute Code
```http
POST /api/v1/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "language": "python",
  "code": "print('Hello, World!')",
  "stdin": ""
}

Response 200:
{
  "status": "success",
  "data": {
    "stdout": "Hello, World!\n",
    "stderr": "",
    "exitCode": 0,
    "executionTime": 45
  }
}
```

### Snapshot Endpoints

#### Create Snapshot
```http
POST /api/v1/sessions/:id/snapshots
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "// Code content here",
  "language": "javascript",
  "message": "Initial solution"
}

Response 201:
{
  "status": "success",
  "data": {
    "snapshot": {
      "content": "...",
      "language": "javascript",
      "message": "Initial solution",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### Get Snapshots
```http
GET /api/v1/sessions/:id/snapshots
Authorization: Bearer <token>

Response 200:
{
  "status": "success",
  "data": {
    "snapshots": [...]
  }
}
```

---

## 🔌 WebSocket Events

### Connection

```javascript
// Client connects with JWT token
const socket = io('http://localhost:4000', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => {
  console.log('Connected to signaling server');
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error);
});
```

### Session Events

#### Join Session
```javascript
// Client emits
socket.emit('join-session', {
  sessionId: 'session-uuid',
  username: 'John Doe',
  isCreator: true  // true for host, false for participant
});

// Server responds
socket.on('admission-status', (status) => {
  // status: { admitted: boolean, isHost: boolean, waitingForHost?: boolean, message?: string }
});
```

#### User Joined
```javascript
// Received when another user joins the session
socket.on('user-joined', (payload) => {
  // payload: { userId: string, username: string, socketId: string }
});
```

#### User Left
```javascript
socket.on('user-left', (payload) => {
  // payload: { userId: string, username: string, socketId: string }
});
```

### Waiting Room Events

#### Host receives waiting list
```javascript
socket.on('waiting-room-list', (list) => {
  // list: Array<{ socketId, userId, username, requestedAt }>
});
```

#### Admit/Reject Participant
```javascript
// Host admits a participant
socket.emit('admit-participant', {
  sessionId: 'session-uuid',
  participantSocketId: 'socket-id'
});

// Host rejects a participant
socket.emit('reject-participant', {
  sessionId: 'session-uuid',
  participantSocketId: 'socket-id'
});

// Toggle auto-admit
socket.emit('set-auto-admit', {
  sessionId: 'session-uuid',
  enabled: true
});
```

### WebRTC Signaling

#### Signal Exchange
```javascript
// Send signal to specific peer
socket.emit('signal', {
  toSocketId: 'target-socket-id',
  signal: { /* SimplePeer signal data */ }
});

// Receive signal from peer
socket.on('signal', (data) => {
  // data: { from: string, signal: any, username: string, userId: string }
});
```

### Chat Events

```javascript
// Send chat message
socket.emit('chat-message', {
  text: 'Hello everyone!'
});

// Receive chat message
socket.on('chat-message', (message) => {
  // message: { id, userId, username, text, timestamp }
});
```

### Code Events

#### Language Change
```javascript
socket.emit('language-change', {
  language: 'python'
});

socket.on('language-change', (data) => {
  // data: { language: string, userId: string, username: string }
});
```

#### Code Execution Result
```javascript
socket.on('run-code', (result) => {
  // result: { stdout, stderr, exitCode, executionTime, userId, username }
});
```

---

## 🧩 Frontend Components

### Page Components

| Component | Path | Purpose |
|-----------|------|---------|
| `Login` | `/login` | User authentication |
| `Register` | `/register` | New user registration |
| `Dashboard` | `/` | Session list and management |
| `InterviewSession` | `/session/:id` | Main interview interface |
| `NotFound` | `*` | 404 error page |

### Core Components

| Component | Purpose |
|-----------|---------|
| `ProtectedRoute` | Auth guard for protected pages |
| `ErrorBoundary` | Graceful error handling |
| `Navbar` | Global navigation |
| `DatabasePanel` | Database schema viewer (future) |

### InterviewSession Subcomponents

| Component | Purpose |
|-----------|---------|
| `LeftPanel` | Problem statement, file tree, participants |
| `EditorContainer` | Monaco Editor wrapper |
| `RightPanel` | Video, output console, activity log, chat |
| `LanguageSelector` | Programming language dropdown |
| `WaitingRoom` | Waiting overlay for unadmitted participants |
| `VideoTile` | Individual video display |

---

## 🔧 Troubleshooting

### Common Issues

#### "Failed to connect to signaling server"

**Causes:**
1. Backend not running
2. Wrong API URL in frontend .env
3. CORS misconfiguration

**Solutions:**
```bash
# Check if backend is running
curl http://localhost:4000/api/v1/health

# Verify CORS setting in backend
# backend/.env
FRONTEND_URL=http://localhost:3000

# Restart backend
cd backend && npm run dev
```

#### "Device in use" - Camera Error

**Cause:** Another application or browser tab is using the camera.

**Solutions:**
1. Close other video applications (Zoom, Teams, etc.)
2. Close other browser tabs using the camera
3. In Chrome: Check `chrome://settings/content/camera`
4. Restart browser

#### WebRTC Connection Not Establishing

**Symptoms:**
- `[WebRTC] Local stream ready` appears but no `[WebRTC] Peer connected!`
- No remote video visible

**Debug Steps:**
1. Check console for `[WebRTC]` logs on BOTH browsers
2. Verify both users are in the SAME session
3. Ensure one user is admitted (not in waiting room)
4. Check firewall isn't blocking WebRTC

**Console log sequence should be:**
```
Host:
[WebRTC] Local stream ready, tracks: ['audio', 'video']
[WebRTC] User joined: ParticipantName socketId: xxx
[WebRTC] Creating initiator peer for: xxx
[WebRTC] Sending signal to: xxx type: offer
[WebRTC] Received signal from: xxx type: answer
[WebRTC] Peer connected!
[WebRTC] Remote stream received! Tracks: ['audio', 'video']

Participant:
[WebRTC] Local stream ready, tracks: ['audio', 'video']
[WebRTC] Received signal from: xxx type: offer
[WebRTC] Creating non-initiator peer
[WebRTC] Sending signal to: xxx type: answer  
[WebRTC] Peer connected!
[WebRTC] Remote stream received! Tracks: ['audio', 'video']
```

#### "Module externalized for browser compatibility" Errors

**Cause:** Vite is not polyfilling Node.js modules needed by SimplePeer.

**Solution:**
The project uses `vite-plugin-node-polyfills`. If you still see these errors:
```bash
cd frontend
npm install vite-plugin-node-polyfills events util buffer process stream-browserify
```

Ensure `vite.config.ts` includes the plugin:
```typescript
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
      include: ['events', 'util', 'buffer', 'process', 'stream'],
    }),
  ],
});
```

#### Database Connection Failed

**Causes:**
1. PostgreSQL not running
2. Wrong credentials
3. Database doesn't exist

**Solutions:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Create database if missing
psql -U postgres -c "CREATE DATABASE codewithme;"

# Verify connection
psql -U postgres -d codewithme -c "SELECT 1;"

# Check backend logs
cd backend && npm run dev
# Look for "Connected to PostgreSQL" message
```

#### Redis Connection Failed

**Causes:**
1. Redis not running
2. Wrong host/port

**Solutions:**
```bash
# Check Redis status
redis-cli ping
# Should respond: PONG

# Start Redis if not running
sudo systemctl start redis

# Or with Docker
docker run -d -p 6379:6379 redis:7-alpine
```

#### Styled-components Prop Warnings

**Warning:** "Received `true` for a non-boolean attribute `active`"

**Cause:** Custom props being passed to DOM elements.

**Solution:** Use transient props (prefix with `$`):
```typescript
// Instead of
const Button = styled.button<{ active?: boolean }>`...`;
<Button active={isActive}>

// Use
const Button = styled.button<{ $active?: boolean }>`...`;
<Button $active={isActive}>
```

### Performance Tips

1. **Limit Participants**: WebRTC performance degrades with many peers
2. **Use Chrome/Edge**: Best WebRTC support
3. **Close Other Tabs**: Reduces memory pressure
4. **Wired Connection**: More stable than WiFi for video
5. **Reduce Video Quality**: If bandwidth is limited

---

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your feature: `git checkout -b feature/my-feature`
4. **Make changes** and write tests
5. **Run tests**: `npm test`
6. **Commit** with conventional commits: `git commit -m "feat: add new feature"`
7. **Push** to your fork: `git push origin feature/my-feature`
8. **Open a Pull Request**

### Commit Convention

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code (no logic changes)
refactor: Refactor code
test: Add tests
chore: Update build/config
```

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Run `npm run lint` before committing
- **Prettier**: Run `npm run format` for consistent formatting
- **Tests**: Aim for 80%+ coverage on new code

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - The code editor that powers VS Code
- [Yjs](https://github.com/yjs/yjs) - CRDT framework for real-time collaboration
- [SimplePeer](https://github.com/feross/simple-peer) - WebRTC made simple
- [Socket.IO](https://socket.io/) - Real-time bidirectional event-based communication
- [Docker](https://www.docker.com/) - Container platform for secure code execution

---

<div align="center">

**Built with ❤️ for better technical interviews**

[Report Bug](https://github.com/yourusername/codewithme/issues) • [Request Feature](https://github.com/yourusername/codewithme/issues) • [Documentation](https://github.com/yourusername/codewithme/wiki)

</div>
