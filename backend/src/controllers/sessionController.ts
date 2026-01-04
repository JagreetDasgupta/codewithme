import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { SessionModel, SessionInput } from '../models/session';
import { ParticipantModel, ParticipantInput } from '../models/participant';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export const createSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      title,
      description,
      problem_statement,
      language,
      scheduled_at,
      duration_minutes,
      participants,
      password
    } = req.body;

    let hashedPassword = undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Create session
    const sessionData: SessionInput = {
      title,
      description,
      problem_statement,
      created_by: req.user.id,
      password: hashedPassword,
      language: language || 'javascript',
      scheduled_at,
      duration_minutes
    };

    const session = await SessionModel.create(sessionData);

    // Add participants if provided
    if (participants && Array.isArray(participants)) {
      for (const participant of participants) {
        const participantData: ParticipantInput = {
          session_id: session.id,
          user_id: participant.user_id,
          role: participant.role
        };
        await ParticipantModel.create(participantData);
      }
    }

    // Add creator as interviewer if not already in participants
    const creatorParticipantData: ParticipantInput = {
      session_id: session.id,
      user_id: req.user.id,
      role: 'interviewer'
    };

    try {
      await ParticipantModel.create(creatorParticipantData);
    } catch (error) {
      // Ignore if creator is already added as participant
    }

    res.status(201).json({
      status: 'success',
      data: {
        session
      }
    });
  } catch (error) {
    logger.error('Error creating session:', error);
    next(new AppError('Error creating interview session', 500));
  }
};

export const joinSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, password } = req.body;

    const session = await SessionModel.findById(id);
    if (!session) {
      return next(new AppError('Session not found', 404));
    }

    if (session.password) {
      if (!password) {
        return next(new AppError('Password required to join this session', 401));
      }
      const isMatch = await bcrypt.compare(password, session.password);
      if (!isMatch) {
        return next(new AppError('Invalid session password', 401));
      }
    }

    // Add user as participant automatically if they join successfully
    try {
      const participantData: ParticipantInput = {
        session_id: session.id,
        user_id: req.user.id,
        role: 'candidate' // Default role
      };
      await ParticipantModel.create(participantData);
    } catch (e) {
      // User might already be a participant, ignore
    }

    res.status(200).json({
      status: 'success',
      data: {
        session
      }
    });
  } catch (error) {
    logger.error('Error joining session:', error);
    next(new AppError('Error joining session', 500));
  }
};

export const getSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const sessions = await SessionModel.findByUser(req.user.id);

    res.status(200).json({
      status: 'success',
      results: sessions.length,
      data: {
        sessions
      }
    });
  } catch (error) {
    logger.error('Error fetching sessions:', error);
    next(new AppError('Error fetching interview sessions', 500));
  }
};

export const getSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const session = await SessionModel.findById(id);
    if (!session) {
      return next(new AppError('Session not found', 404));
    }

    // Get participants
    const participants = await ParticipantModel.findBySessionId(id);

    res.status(200).json({
      status: 'success',
      data: {
        session,
        participants
      }
    });
  } catch (error) {
    logger.error('Error fetching session:', error);
    next(new AppError('Error fetching interview session', 500));
  }
};

export const updateSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      problem_statement,
      scheduled_at,
      duration_minutes,
      status
    } = req.body;

    // Check if session exists
    const existingSession = await SessionModel.findById(id);
    if (!existingSession) {
      return next(new AppError('Session not found', 404));
    }

    // Check if user is the creator
    if (existingSession.created_by !== req.user.id) {
      return next(new AppError('You are not authorized to update this session', 403));
    }

    // Update session
    const sessionData: Partial<SessionInput> = {
      title,
      description,
      problem_statement,
      scheduled_at,
      duration_minutes,
      status
    };

    const updatedSession = await SessionModel.update(id, sessionData);

    res.status(200).json({
      status: 'success',
      data: {
        session: updatedSession
      }
    });
  } catch (error) {
    logger.error('Error updating session:', error);
    next(new AppError('Error updating interview session', 500));
  }
};

export const deleteSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if session exists
    const existingSession = await SessionModel.findById(id);
    if (!existingSession) {
      return next(new AppError('Session not found', 404));
    }

    // Check if user is the creator
    if (existingSession.created_by !== req.user.id) {
      return next(new AppError('You are not authorized to delete this session', 403));
    }

    // Delete session
    await SessionModel.delete(id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error('Error deleting session:', error);
    next(new AppError('Error deleting interview session', 500));
  }
};

export const addParticipant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { user_id, role } = req.body;

    // Check if session exists
    const existingSession = await SessionModel.findById(id);
    if (!existingSession) {
      return next(new AppError('Session not found', 404));
    }

    // Check if user is the creator
    if (existingSession.created_by !== req.user.id) {
      return next(new AppError('You are not authorized to add participants to this session', 403));
    }

    // Add participant
    const participantData: ParticipantInput = {
      session_id: id,
      user_id,
      role
    };

    const participant = await ParticipantModel.create(participantData);

    res.status(201).json({
      status: 'success',
      data: {
        participant
      }
    });
  } catch (error) {
    logger.error('Error adding participant:', error);
    next(new AppError('Error adding participant to session', 500));
  }
};

export const removeParticipant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, userId } = req.params;

    // Check if session exists
    const existingSession = await SessionModel.findById(id);
    if (!existingSession) {
      return next(new AppError('Session not found', 404));
    }

    // Check if user is the creator
    if (existingSession.created_by !== req.user.id) {
      return next(new AppError('You are not authorized to remove participants from this session', 403));
    }

    // Remove participant
    await ParticipantModel.delete(id, userId);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error('Error removing participant:', error);
    next(new AppError('Error removing participant from session', 500));
  }
};