import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface Participant {
  id: string;
  session_id: string;
  user_id: string;
  role: 'interviewer' | 'candidate';
  joined_at?: Date;
  left_at?: Date;
  created_at: Date;
}

export interface ParticipantInput {
  session_id: string;
  user_id: string;
  role: 'interviewer' | 'candidate';
  joined_at?: Date;
  left_at?: Date;
}

export class ParticipantModel {
  static async createTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS session_participants (
        id UUID PRIMARY KEY,
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id),
        role VARCHAR(50) NOT NULL,
        joined_at TIMESTAMP WITH TIME ZONE,
        left_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id, user_id)
      )
    `;
    
    try {
      await pool.query(query);
    } catch (error) {
      throw new Error(`Error creating session_participants table: ${error}`);
    }
  }

  static async create(participantData: ParticipantInput): Promise<Participant> {
    const { session_id, user_id, role, joined_at, left_at } = participantData;
    const id = uuidv4();
    
    const query = `
      INSERT INTO session_participants (id, session_id, user_id, role, joined_at, left_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [id, session_id, user_id, role, joined_at, left_at]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating session participant: ${error}`);
    }
  }

  static async findBySessionId(sessionId: string): Promise<Participant[]> {
    const query = `
      SELECT sp.*, u.name, u.email
      FROM session_participants sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.session_id = $1
    `;
    
    try {
      const result = await pool.query(query, [sessionId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding participants by session id: ${error}`);
    }
  }

  static async updateJoinTime(sessionId: string, userId: string): Promise<Participant | null> {
    const query = `
      UPDATE session_participants
      SET joined_at = CURRENT_TIMESTAMP
      WHERE session_id = $1 AND user_id = $2
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [sessionId, userId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating participant join time: ${error}`);
    }
  }

  static async updateLeaveTime(sessionId: string, userId: string): Promise<Participant | null> {
    const query = `
      UPDATE session_participants
      SET left_at = CURRENT_TIMESTAMP
      WHERE session_id = $1 AND user_id = $2
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [sessionId, userId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating participant leave time: ${error}`);
    }
  }

  static async delete(sessionId: string, userId: string): Promise<boolean> {
    const query = 'DELETE FROM session_participants WHERE session_id = $1 AND user_id = $2';
    
    try {
      const result = await pool.query(query, [sessionId, userId]);
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Error deleting session participant: ${error}`);
    }
  }
}