import { Request, Response, NextFunction } from 'express';
import { RecordingService } from '../services/recordingService';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export const startRecording = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: sessionId } = req.params;
    const userId = (req as any).user.id;

    const recording = await RecordingService.startRecording(sessionId, userId);

    res.status(200).json({
      status: 'success',
      data: { recording }
    });
  } catch (error) {
    logger.error('Error starting recording:', error);
    next(new AppError('Failed to start recording', 500));
  }
};

export const stopRecording = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: sessionId } = req.params;

    const recording = await RecordingService.stopRecording(sessionId);

    res.status(200).json({
      status: 'success',
      data: { recording }
    });
  } catch (error) {
    logger.error('Error stopping recording:', error);
    next(new AppError('Failed to stop recording', 500));
  }
};

export const getRecording = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: sessionId } = req.params;

    const recording = await RecordingService.getRecordingSession(sessionId);
    if (!recording) {
      return next(new AppError('Recording not found', 404));
    }

    const events = await RecordingService.getRecordingEvents(sessionId);

    res.status(200).json({
      status: 'success',
      data: {
        recording,
        events
      }
    });
  } catch (error) {
    logger.error('Error fetching recording:', error);
    next(new AppError('Failed to fetch recording', 500));
  }
};

export const recordEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: sessionId } = req.params;
    const { event_type, event_data } = req.body;
    const userId = (req as any).user.id;

    if (!event_type || !event_data) {
      return next(new AppError('event_type and event_data are required', 400));
    }

    await RecordingService.recordEvent(sessionId, userId, event_type, event_data);

    res.status(201).json({
      status: 'success',
      message: 'Event recorded'
    });
  } catch (error) {
    logger.error('Error recording event:', error);
    next(new AppError('Failed to record event', 500));
  }
};

