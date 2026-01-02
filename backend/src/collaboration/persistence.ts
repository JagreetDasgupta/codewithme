import * as Y from 'yjs';
import { getRedis, isRedisAvailable } from '../utils/redis';
import logger from '../utils/logger';

const updatesKey = (room: string) => `yjs:${room}:updates`;
const snapshotKey = (room: string) => `yjs:${room}:snapshot:latest`;

/**
 * Bind Yjs document state to Redis for persistence.
 * If Redis is not available, the document works in memory only.
 */
export const bindState = async (room: string, doc: Y.Doc) => {
  const client = getRedis();

  if (!client || !isRedisAvailable()) {
    logger.info(`Yjs room ${room} running in memory-only mode (Redis not configured)`);
    return;
  }

  try {
    const snap = await client.get(snapshotKey(room));
    if (snap) {
      const u8 = Uint8Array.from(Buffer.from(snap, 'base64'));
      Y.applyUpdate(doc, u8);
    }
    const ups = await client.lRange(updatesKey(room), 0, -1);
    ups.forEach((u) => {
      const u8 = Uint8Array.from(Buffer.from(u, 'base64'));
      Y.applyUpdate(doc, u8);
    });
  } catch (err) {
    logger.warn('Failed to restore Yjs state from Redis:', (err as Error).message);
  }

  doc.on('update', async (update: Uint8Array) => {
    if (!isRedisAvailable()) return;

    try {
      const b64 = Buffer.from(update).toString('base64');
      await client.rPush(updatesKey(room), b64);
      // Compact if list too long
      const len = await client.lLen(updatesKey(room));
      if (len > 500) {
        const stateUpdate = Y.encodeStateAsUpdate(doc);
        const snapB64 = Buffer.from(stateUpdate).toString('base64');
        await client.set(snapshotKey(room), snapB64);
        await client.del(updatesKey(room));
      }
    } catch (err) {
      // Silently fail - persistence is optional
    }
  });
};

export const writeState = async (room: string, doc: Y.Doc) => {
  const client = getRedis();

  if (!client || !isRedisAvailable()) return;

  try {
    const stateUpdate = Y.encodeStateAsUpdate(doc);
    await client.set(snapshotKey(room), Buffer.from(stateUpdate).toString('base64'));
    await client.del(updatesKey(room));
  } catch (err) {
    // Silently fail - persistence is optional
  }
};