import pool from '../config/database';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface RecordingEvent {
  id: string;
  session_id: string;
  user_id: string;
  event_type: 'code_change' | 'cursor_move' | 'selection' | 'execution' | 'chat' | 'video_state';
  event_data: any;
  timestamp: Date;
}

export interface RecordingSession {
  id: string;
  session_id: string;
  started_at: Date;
  ended_at?: Date;
  status: 'recording' | 'completed' | 'failed';
  file_path?: string;
}

export class RecordingService {
  /**
   * Start recording a session
   */
  static async startRecording(sessionId: string, userId: string): Promise<RecordingSession> {
    try {
      // Check if recording already exists
      const existing = await pool.query(
        'SELECT * FROM recording_sessions WHERE session_id = $1 AND status = $2',
        [sessionId, 'recording']
      );

      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

      // Create new recording session
      const id = uuidv4();
      const result = await pool.query(
        `INSERT INTO recording_sessions (id, session_id, started_by, started_at, status)
         VALUES ($1, $2, $3, NOW(), 'recording')
         RETURNING *`,
        [id, sessionId, userId]
      );

      logger.info(`Recording started for session ${sessionId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error starting recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording a session
   */
  static async stopRecording(sessionId: string): Promise<RecordingSession> {
    try {
      const result = await pool.query(
        `UPDATE recording_sessions
         SET ended_at = NOW(), status = 'completed'
         WHERE session_id = $1 AND status = 'recording'
         RETURNING *`,
        [sessionId]
      );

      if (result.rows.length === 0) {
        throw new Error('No active recording found');
      }

      logger.info(`Recording stopped for session ${sessionId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error stopping recording:', error);
      throw error;
    }
  }

  /**
   * Record an event
   */
  static async recordEvent(
    sessionId: string,
    userId: string,
    eventType: RecordingEvent['event_type'],
    eventData: any
  ): Promise<void> {
    try {
      const id = uuidv4();
      await pool.query(
        `INSERT INTO recording_events (id, session_id, user_id, event_type, event_data, timestamp)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [id, sessionId, userId, eventType, JSON.stringify(eventData)]
      );
    } catch (error) {
      logger.error('Error recording event:', error);
      // Don't throw - recording should not break the main flow
    }
  }

  /**
   * Get recording events for a session
   */
  static async getRecordingEvents(sessionId: string): Promise<RecordingEvent[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM recording_events
         WHERE session_id = $1
         ORDER BY timestamp ASC`,
        [sessionId]
      );

      return result.rows.map(row => ({
        ...row,
        event_data: typeof row.event_data === 'string' 
          ? JSON.parse(row.event_data) 
          : row.event_data
      }));
    } catch (error) {
      logger.error('Error fetching recording events:', error);
      throw error;
    }
  }

  /**
   * Get recording session info
   */
  static async getRecordingSession(sessionId: string): Promise<RecordingSession | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM recording_sessions WHERE session_id = $1 ORDER BY started_at DESC LIMIT 1',
        [sessionId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching recording session:', error);
      throw error;
    }
  }
}

