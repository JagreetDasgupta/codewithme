import { Request, Response } from 'express';
import { getRedis, snapshotKey, isRedisAvailable } from '../utils/redis';

// In-memory fallback when Redis is not available
const memorySnapshots: Map<string, string[]> = new Map();

export const createSnapshot = async (req: Request, res: Response) => {
  const { id: sessionId } = req.params;
  const { content, language, message } = req.body || {};
  if (!content || !language) {
    return res.status(400).json({ status: 'fail', message: 'content and language are required' });
  }

  const snapshot = {
    content,
    language,
    message: message || 'Snapshot',
    userId: (req as any).user?.id || 'unknown',
    username: (req as any).user?.name || 'unknown',
    createdAt: new Date().toISOString()
  };

  const client = getRedis();
  if (client && isRedisAvailable()) {
    try {
      await client.rPush(snapshotKey(sessionId), JSON.stringify(snapshot));
    } catch (err) {
      // Fall back to memory
      const list = memorySnapshots.get(sessionId) || [];
      list.push(JSON.stringify(snapshot));
      memorySnapshots.set(sessionId, list);
    }
  } else {
    // Use in-memory storage
    const list = memorySnapshots.get(sessionId) || [];
    list.push(JSON.stringify(snapshot));
    memorySnapshots.set(sessionId, list);
  }

  return res.status(201).json({ status: 'success', data: { snapshot } });
};

export const listSnapshots = async (req: Request, res: Response) => {
  const { id: sessionId } = req.params;

  const client = getRedis();
  let list: string[] = [];

  if (client && isRedisAvailable()) {
    try {
      list = await client.lRange(snapshotKey(sessionId), 0, -1);
    } catch (err) {
      list = memorySnapshots.get(sessionId) || [];
    }
  } else {
    list = memorySnapshots.get(sessionId) || [];
  }

  const snapshots = list.map((s) => JSON.parse(s));
  return res.status(200).json({ status: 'success', data: { snapshots } });
};

export const getSnapshot = async (req: Request, res: Response) => {
  const { id: sessionId, index } = req.params as any;
  const idx = parseInt(index, 10);
  if (Number.isNaN(idx)) return res.status(400).json({ status: 'fail', message: 'invalid index' });

  const client = getRedis();
  let val: string | null = null;

  if (client && isRedisAvailable()) {
    try {
      val = await client.lIndex(snapshotKey(sessionId), idx);
    } catch (err) {
      const list = memorySnapshots.get(sessionId) || [];
      val = list[idx] || null;
    }
  } else {
    const list = memorySnapshots.get(sessionId) || [];
    val = list[idx] || null;
  }

  if (!val) return res.status(404).json({ status: 'fail', message: 'not found' });
  return res.status(200).json({ status: 'success', data: { snapshot: JSON.parse(val) } });
};