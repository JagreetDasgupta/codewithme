import * as http from 'http';
import * as ws from 'ws';
import { URL } from 'url';
import { verifyToken } from '../utils/auth';
import { spawn } from 'child_process';
import logger from '../utils/logger';

export const setupLspGateway = (server: http.Server) => {
  const wss = new ws.Server({ noServer: true });

  const languageProcess = (language: string) => {
    const envPy = process.env.PYRIGHT_PATH || 'pyright-langserver';
    const envJdt = process.env.JDTLS_PATH || 'jdtls';
    const envClangd = process.env.CLANGD_PATH || 'clangd';
    if (language === 'python') return spawn(envPy, ['--stdio']);
    if (language === 'java') return spawn(envJdt, []);
    if (language === 'cpp') return spawn(envClangd, ['--log=error']);
    return null;
  };

  wss.on('connection', (socket: ws, req: http.IncomingMessage) => {
    try {
      const url = new URL(`http://localhost${req.url}`);
      const language = url.pathname.split('/').pop() || url.searchParams.get('language') || '';
      const child = languageProcess(language);
      if (!child) {
        socket.close(1011, 'Language server not available');
        return;
      }

      const onMessage = (data: ws.RawData) => {
        child.stdin.write(data);
      };
      socket.on('message', onMessage);

      child.stdout.on('data', (chunk) => {
        socket.send(chunk);
      });
      child.stderr.on('data', (chunk) => {
        logger.error(`LSP ${language} stderr: ${chunk}`);
      });
      child.on('exit', (code) => {
        socket.close(1011, `LSP exited ${code}`);
      });
      socket.on('close', () => {
        socket.off('message', onMessage);
        child.kill('SIGTERM');
      });
    } catch (err) {
      logger.error('LSP gateway error', err as any);
      try { socket.close(); } catch {}
    }
  });

  server.on('upgrade', async (request, socket, head) => {
    const pathname = request.url || '';
    if (!pathname.startsWith('/lsp')) return;

    try {
      const url = new URL(`http://localhost${pathname}`);
      const token = url.searchParams.get('token') || '';
      const user = await verifyToken(token);
      if (!user) {
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request, socket, head, (wsocket) => {
        (request as any).user = user;
        wss.emit('connection', wsocket, request);
      });
    } catch (err) {
      socket.destroy();
    }
  });
};