import * as http from 'http';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket/bin/utils';
import { setupWSConnection } from 'y-websocket/bin/utils';
// Attempt to import persistence hook (available in y-websocket server builds)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ywsUtils = require('y-websocket/bin/utils');
const setPersistence = ywsUtils?.setPersistence;
import { bindState, writeState } from './persistence';
import * as ws from 'ws';
import logger from '../utils/logger';
import { verifyToken } from '../utils/auth';
import { URL } from 'url';

export const setupYjsWebSocketServer = (server: http.Server) => {
  // Create WebSocket server
  const wss = new ws.Server({ noServer: true });

  // Handle WebSocket connections for Y.js
  wss.on('connection', (conn: ws, req: http.IncomingMessage) => {
    if (typeof setPersistence === 'function') {
      setPersistence({ bindState, writeState });
    }
    setupWSConnection(conn, req, {
      // Y.js document persistence configuration could be added here
      gc: true, // Enable garbage collection
    });
    logger.info('Y.js WebSocket connection established');
  });

  // Handle upgrade requests for Y.js WebSocket connections
  server.on('upgrade', async (request, socket, head) => {
    const pathname = request.url || '';

    if (!pathname.startsWith('/yjs')) {
      return;
    }

    try {
      const url = new URL(`http://localhost${pathname}`);
      const token = url.searchParams.get('token') || '';

      const user = await verifyToken(token);
      if (!user) {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        // Attach user info to request for downstream usage if needed
        (request as any).user = user;
        wss.emit('connection', ws, request);
      });
    } catch (err) {
      logger.error('Yjs upgrade auth error', err as any);
      socket.destroy();
    }
  });

  logger.info('Y.js WebSocket server initialized');
};