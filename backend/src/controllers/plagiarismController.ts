import { Request, Response, NextFunction } from 'express';
import { PlagiarismService } from '../services/plagiarismService';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export const checkPlagiarism = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: sessionId } = req.params;
    const { code, language } = req.body;

    if (!code || !language) {
      return next(new AppError('code and language are required', 400));
    }

    const result = await PlagiarismService.checkPlagiarism(sessionId, code, language);

    res.status(200).json({
      status: 'success',
      data: { check: result }
    });
  } catch (error) {
    logger.error('Error checking plagiarism:', error);
    next(new AppError('Failed to check plagiarism', 500));
  }
};

export const getPlagiarismChecks = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: sessionId } = req.params;

    const checks = await PlagiarismService.getSessionChecks(sessionId);

    res.status(200).json({
      status: 'success',
      data: { checks }
    });
  } catch (error) {
    logger.error('Error fetching plagiarism checks:', error);
    next(new AppError('Failed to fetch plagiarism checks', 500));
  }
};

