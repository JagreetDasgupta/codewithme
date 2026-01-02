import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user';
import logger from './logger';

export const verifyToken = async (token: string): Promise<any> => {
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await UserModel.findById(decoded.id);
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
  } catch (error) {
    logger.error('Token verification error:', error);
    return null;
  }
};