import { Request } from 'express';

// User related types
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Session related types
export interface Session {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDTO {
  id: string;
  title: string;
  description: string;
  owner: UserDTO;
  participants: ParticipantDTO[];
  createdAt: Date;
  updatedAt: Date;
}

// Participant related types
export interface Participant {
  id: string;
  sessionId: string;
  userId: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParticipantDTO {
  id: string;
  user: UserDTO;
  role: string;
}

// Code snippet related types
export interface CodeSnippet {
  id: string;
  sessionId: string;
  userId: string;
  content: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CodeSnippetDTO {
  id: string;
  content: string;
  language: string;
  user: UserDTO;
  createdAt: Date;
}

// Authentication related types
export interface AuthRequest extends Request {
  user?: UserDTO;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

// WebSocket related types
export interface WebSocketMessage {
  type: string;
  payload: any;
}

// API response types
export interface ApiResponse<T> {
  status: string;
  message: string;
  data?: T;
}

// Error response type
export interface ErrorResponse {
  status: string;
  message: string;
  statusCode: number;
}