import { Server, Socket } from 'socket.io';
import logger from '../utils/logger';
import { verifyToken } from '../utils/auth';
import { isInterviewer } from '../utils/permissions';
import { CodeExecutionService } from '../services/codeExecutionService';

interface UserSession {
  userId: string;
  username: string;
  sessionId: string;
  isHost?: boolean;
}

interface WaitingParticipant {
  socketId: string;
  userId: string;
  username: string;
  requestedAt: Date;
}

// Store active sessions and their participants
const activeSessions: Map<string, Set<string>> = new Map();
const userSessions: Map<string, UserSession> = new Map();

// Waiting room: sessionId -> waiting participants
const waitingRooms: Map<string, WaitingParticipant[]> = new Map();

// Track host presence: sessionId -> host socketId
const sessionHosts: Map<string, string> = new Map();

// Auto-admit settings: sessionId -> boolean
const autoAdmitSettings: Map<string, boolean> = new Map();

export const setupWebSocketServer = (io: Server) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const user = await verifyToken(token);
      if (!user) {
        return next(new Error('Authentication error: Invalid token'));
      }

      // Attach user data to socket
      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Handle connections
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    logger.info(`User connected: ${user.name} (${user.id})`);

    // Join interview session - with waiting room logic
    socket.on('join-session', async ({ sessionId, username, isCreator }) => {
      const userId = user.id;
      const isHost = isCreator === true;

      if (isHost) {
        // Host joins directly
        userSessions.set(socket.id, {
          userId,
          username: username || user.name,
          sessionId,
          isHost: true
        });

        // Track host
        sessionHosts.set(sessionId, socket.id);

        // Add to active session
        if (!activeSessions.has(sessionId)) {
          activeSessions.set(sessionId, new Set());
        }
        activeSessions.get(sessionId)?.add(socket.id);

        // Join the room
        socket.join(sessionId);

        // Notify others (if any)
        socket.to(sessionId).emit('host-joined', {
          userId,
          username: username || user.name,
          socketId: socket.id
        });

        // Send admission status
        socket.emit('admission-status', { admitted: true, isHost: true });

        // Send waiting room list to host
        const waiting = waitingRooms.get(sessionId) || [];
        socket.emit('waiting-room-list', waiting);

        logger.info(`Host ${user.name} joined session ${sessionId}`);
      } else {
        // Participant: check if auto-admit or waiting room
        const hostSocketId = sessionHosts.get(sessionId);
        const autoAdmit = autoAdmitSettings.get(sessionId) || false;

        if (hostSocketId && autoAdmit) {
          // Auto-admit: join directly
          userSessions.set(socket.id, {
            userId,
            username: username || user.name,
            sessionId,
            isHost: false
          });

          if (!activeSessions.has(sessionId)) {
            activeSessions.set(sessionId, new Set());
          }
          activeSessions.get(sessionId)?.add(socket.id);

          socket.join(sessionId);

          // Notify host and others
          socket.to(sessionId).emit('user-joined', {
            userId,
            username: username || user.name,
            socketId: socket.id
          });

          socket.emit('admission-status', { admitted: true, isHost: false });
          logger.info(`Participant ${user.name} auto-admitted to session ${sessionId}`);
        } else if (!hostSocketId) {
          // Host not in session yet - put in waiting room
          if (!waitingRooms.has(sessionId)) {
            waitingRooms.set(sessionId, []);
          }
          waitingRooms.get(sessionId)?.push({
            socketId: socket.id,
            userId,
            username: username || user.name,
            requestedAt: new Date()
          });

          // Store minimal session info
          userSessions.set(socket.id, {
            userId,
            username: username || user.name,
            sessionId,
            isHost: false
          });

          // Send waiting status
          socket.emit('admission-status', {
            admitted: false,
            isHost: false,
            waitingForHost: true,
            message: 'Waiting for host to start the session...'
          });

          logger.info(`Participant ${user.name} waiting for host in session ${sessionId}`);
        } else {
          // Host is present but auto-admit is off - add to waiting room
          if (!waitingRooms.has(sessionId)) {
            waitingRooms.set(sessionId, []);
          }
          waitingRooms.get(sessionId)?.push({
            socketId: socket.id,
            userId,
            username: username || user.name,
            requestedAt: new Date()
          });

          userSessions.set(socket.id, {
            userId,
            username: username || user.name,
            sessionId,
            isHost: false
          });

          // Notify host about new participant waiting
          io.to(hostSocketId).emit('admission-request', {
            socketId: socket.id,
            userId,
            username: username || user.name,
            requestedAt: new Date()
          });

          // Send waiting status to participant
          socket.emit('admission-status', {
            admitted: false,
            isHost: false,
            waitingForHost: false,
            message: 'Waiting for host to admit you...'
          });

          logger.info(`Participant ${user.name} requesting admission to session ${sessionId}`);
        }
      }
    });

    // Host admits a participant
    socket.on('admit-participant', ({ participantSocketId, sessionId }) => {
      const userSession = userSessions.get(socket.id);
      if (!userSession?.isHost) return;

      // Remove from waiting room
      const waiting = waitingRooms.get(sessionId) || [];
      const idx = waiting.findIndex(p => p.socketId === participantSocketId);
      if (idx !== -1) {
        waiting.splice(idx, 1);
      }

      // Get participant socket
      const participantSocket = io.sockets.sockets.get(participantSocketId);
      if (!participantSocket) return;

      // Add to active session
      if (!activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, new Set());
      }
      activeSessions.get(sessionId)?.add(participantSocketId);

      // Join the room
      participantSocket.join(sessionId);

      // Notify participant they're admitted
      participantSocket.emit('admission-status', { admitted: true, isHost: false });

      // Notify others
      const pSession = userSessions.get(participantSocketId);
      io.to(sessionId).emit('user-joined', {
        userId: pSession?.userId,
        username: pSession?.username,
        socketId: participantSocketId
      });

      // Update host's waiting list
      socket.emit('waiting-room-list', waiting);

      logger.info(`Host admitted participant ${pSession?.username} to session ${sessionId}`);
    });

    // Host rejects a participant
    socket.on('reject-participant', ({ participantSocketId, sessionId }) => {
      const userSession = userSessions.get(socket.id);
      if (!userSession?.isHost) return;

      // Remove from waiting room
      const waiting = waitingRooms.get(sessionId) || [];
      const idx = waiting.findIndex(p => p.socketId === participantSocketId);
      if (idx !== -1) {
        waiting.splice(idx, 1);
      }

      // Notify participant they're rejected
      io.to(participantSocketId).emit('admission-rejected', {
        message: 'The host has denied your request to join this session.'
      });

      // Remove their session info
      userSessions.delete(participantSocketId);

      // Update host's waiting list
      socket.emit('waiting-room-list', waiting);

      logger.info(`Host rejected participant from session ${sessionId}`);
    });

    // Host sets auto-admit
    socket.on('set-auto-admit', ({ sessionId, enabled }) => {
      const userSession = userSessions.get(socket.id);
      if (!userSession?.isHost) return;

      autoAdmitSettings.set(sessionId, enabled);
      socket.emit('auto-admit-updated', { enabled });
      logger.info(`Auto-admit for session ${sessionId} set to ${enabled}`);
    });

    // Send current participants to requesting user
    socket.on('get-participants', ({ sessionId }) => {
      const participants = Array.from(activeSessions.get(sessionId) || [])
        .filter(id => id !== socket.id)
        .map(id => {
          const session = userSessions.get(id);
          return {
            userId: session?.userId,
            username: session?.username,
            socketId: id,
            isHost: session?.isHost || false
          };
        });
      socket.emit('session-participants', participants);
    });

    // Handle video signaling
    socket.on('video-signal', ({ to, signal }) => {
      const userSession = userSessions.get(socket.id);
      if (!userSession) return;

      io.to(to).emit('video-signal', {
        from: socket.id,
        signal,
        username: userSession.username,
        userId: userSession.userId
      });
    });

    // Generic signaling handler for compatibility
    socket.on('signal', ({ toSocketId, signal }) => {
      const userSession = userSessions.get(socket.id);
      if (!userSession) {
        logger.warn('Signal from unknown socket', { socketId: socket.id, toSocketId });
        return;
      }
      logger.info('Forwarding signal', {
        from: socket.id,
        to: toSocketId,
        signalType: signal?.type,
        username: userSession.username
      });
      io.to(toSocketId).emit('signal', {
        from: socket.id,
        signal,
        username: userSession.username,
        userId: userSession.userId
      });
    });

    // Handle chat messages
    socket.on('chat-message', (message) => {
      const userSession = userSessions.get(socket.id);
      if (!userSession) return;

      io.to(userSession.sessionId).emit('chat-message', {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: userSession.userId,
        username: userSession.username,
        text: message.text,
        timestamp: new Date().toISOString()
      });
    });

    // Handle problem statement updates
    socket.on('problem-statement-update', (data) => {
      const userSession = userSessions.get(socket.id);
      if (!userSession) return;

      io.to(userSession.sessionId).emit('problem-statement-update', {
        text: data.text,
        userId: userSession.userId,
        username: userSession.username,
        timestamp: new Date().toISOString()
      });
    });

    // Handle language change updates from frontend
    socket.on('language-change', (data) => {
      const userSession = userSessions.get(socket.id);
      if (!userSession) return;

      io.to(userSession.sessionId).emit('language-change', {
        language: data.language,
        userId: userSession.userId,
        username: userSession.username,
        timestamp: new Date().toISOString()
      });

      logger.info(`Language changed to ${data.language} by ${userSession.username} in session ${userSession.sessionId}`);
    });

    // Handle proctoring events (alias for frontend 'proctor-event')
    socket.on('proctor-event', (event) => {
      const userSession = userSessions.get(socket.id);
      if (!userSession) return;

      socket.to(userSession.sessionId).emit('proctoring-event', {
        userId: userSession.userId,
        username: userSession.username,
        event,
        timestamp: new Date().toISOString()
      });

      logger.info(`Proctor event from ${userSession.username}: ${event.type}`);
    });

    // Broadcast editor focus changes to the session
    socket.on('focus-change', ({ index }) => {
      const userSession = userSessions.get(socket.id);
      if (!userSession) return;
      io.to(userSession.sessionId).emit('focus-change', {
        index,
        userId: userSession.userId,
        username: userSession.username,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
    });

    // Lock override (RBAC: interviewer or admin)
    socket.on('lock-override', async ({ sessionId, key, action, newOwnerId }) => {
      const userSession = userSessions.get(socket.id);
      if (!userSession) return;
      const isAllowed = socket.data.user?.role === 'admin' || await isInterviewer(sessionId, socket.data.user.id);
      if (!isAllowed) {
        socket.emit('lock-override-denied', { key, action });
        return;
      }
      io.to(sessionId).emit('lock-override', {
        key,
        action,
        newOwnerId,
        userId: socket.data.user.id,
        username: socket.data.user.name,
        timestamp: new Date().toISOString()
      });
    });

    // Handle code execution via WebSocket: 'run-code' from frontend
    socket.on('run-code', async ({ language, code, input, sessionId }) => {
      const userSession = userSessions.get(socket.id);
      if (!userSession) return;

      try {
        logger.info(`Executing ${language} code for session ${sessionId}`);
        const result = await CodeExecutionService.execute(code, language, input || '');

        // Broadcast result to everyone in session
        io.to(sessionId).emit('run-result', {
          exitCode: result.exitCode,
          stdout: result.stdout || '',
          stderr: result.stderr || result.compilationError || '',
          runtimeMs: result.executionTime,
          userId: socket.id // Optional: to ID who ran it
        });
      } catch (error: any) {
        logger.error('Code execution error:', error);
        io.to(sessionId).emit('run-result', {
          exitCode: -1,
          stdout: '',
          stderr: error.message || 'Error executing code'
        });
      }
    });

    // Handle file list updates (add/rename/delete)
    socket.on('file-update', (data) => {
      const userSession = userSessions.get(socket.id);
      if (!userSession) return;

      // Broadcast to everyone else in session
      socket.to(userSession.sessionId).emit('file-update', {
        files: data.files,
        updatedBy: userSession.username
      });
    });

    // Update existing execute-code handler
    socket.on('execute-code', async (payload) => {
      const { language, code, input } = payload || {};
      const userSession = userSessions.get(socket.id);
      if (!userSession) return;

      try {
        const result = await CodeExecutionService.execute(code, language, input || '');

        socket.emit('execution-result', {
          success: result.exitCode === 0,
          output: result.stdout || '',
          executionTime: result.executionTime,
          error: result.stderr || result.compilationError || ''
        });
      } catch (error: any) {
        socket.emit('execution-result', {
          success: false,
          error: error.message || 'Error executing code'
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const userSession = userSessions.get(socket.id);
      if (userSession) {
        const { sessionId, userId, username } = userSession;

        // Remove from session participants
        activeSessions.get(sessionId)?.delete(socket.id);
        if (activeSessions.get(sessionId)?.size === 0) {
          activeSessions.delete(sessionId);
        }

        // Remove user session
        userSessions.delete(socket.id);

        // Notify others in the session
        socket.to(sessionId).emit('user-left', {
          userId,
          username,
          socketId: socket.id
        });

        logger.info(`User ${username} left session ${sessionId}`);
      }

      logger.info(`User disconnected: ${user?.name || 'Unknown'}`);
    });
  });
};