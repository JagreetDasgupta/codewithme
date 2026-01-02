import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface Session {
  id: string;
  title: string;
  description?: string;
  problem_statement?: string;
  created_by: string;
  password?: string;
  language: string;
  scheduled_at?: Date;
  duration_minutes?: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

export interface SessionInput {
  title: string;
  description?: string;
  problem_statement?: string;
  created_by: string;
  password?: string;
  language?: string;
  scheduled_at?: Date;
  duration_minutes?: number;
  status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

export class SessionModel {
  static async createTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        problem_statement TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        password VARCHAR(255),
        scheduled_at TIMESTAMP WITH TIME ZONE,
        duration_minutes INTEGER,
        status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await pool.query(query);
    } catch (error) {
      throw new Error(`Error creating sessions table: ${error}`);
    }
  }

  static async create(sessionData: SessionInput): Promise<Session> {
    const {
      title,
      description,
      problem_statement,
      created_by,
      password,
      language = 'javascript',
      scheduled_at,
      duration_minutes,
      status = 'scheduled'
    } = sessionData;

    const id = uuidv4();

    const query = `
      INSERT INTO sessions (
        id, title, description, problem_statement, created_by, password,
        language, scheduled_at, duration_minutes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [
        id, title, description, problem_statement, created_by, password,
        language, scheduled_at, duration_minutes, status
      ]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating session: ${error}`);
    }
  }

  static async findById(id: string): Promise<Session | null> {
    const query = 'SELECT * FROM sessions WHERE id = $1';

    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding session by id: ${error}`);
    }
  }

  static async findByUser(userId: string): Promise<Session[]> {
    const query = `
      SELECT DISTINCT s.* FROM sessions s
      LEFT JOIN session_participants sp ON s.id = sp.session_id
      WHERE s.created_by = $1 OR sp.user_id = $1
      ORDER BY s.scheduled_at DESC
    `;

    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding sessions by user: ${error}`);
    }
  }

  static async update(id: string, data: Partial<SessionInput>): Promise<Session | null> {
    // Build dynamic query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    // Add updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add session id as the last parameter
    values.push(id);

    const query = `
      UPDATE sessions
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating session: ${error}`);
    }
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM sessions WHERE id = $1';

    try {
      const result = await pool.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Error deleting session: ${error}`);
    }
  }
}