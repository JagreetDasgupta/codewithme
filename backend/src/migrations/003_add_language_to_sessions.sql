-- Migration: 003_add_language_to_sessions.sql
-- Description: Add language column to sessions table
-- Created: 2024-12-17

-- Add language column to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS language VARCHAR(50) NOT NULL DEFAULT 'javascript';
