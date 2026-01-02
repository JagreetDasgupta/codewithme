import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserModel, UserInput } from '../models/user';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import Joi from 'joi';

// Generate JWT token
const signToken = (id: string): string => {
  const secret = process.env.JWT_SECRET || 'fallback_secret';
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as any
  };
  return jwt.sign({ id }, secret, options);
};

// Send JWT token response
const createSendToken = (user: any, statusCode: number, res: Response) => {
  const token = signToken(user.id);
  
  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, name, password } = req.body;

    const schema = Joi.object({
      name: Joi.string().trim().min(2).max(255).required(),
      email: Joi.string().trim().lowercase().email().max(255).required(),
      password: Joi.string().min(6).max(255).required()
    });
    const { value, error } = schema.validate({ email, name, password });
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    const validEmail = value.email;
    const validName = value.name;
    const validPassword = value.password;

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(validEmail);
    if (existingUser) {
      return next(new AppError('Email already in use', 400));
    }

    // Create new user
    const userData: UserInput = {
      email: validEmail,
      name: validName,
      password: validPassword
    };

    const newUser = await UserModel.create(userData);
    
    // Generate and send token
    createSendToken(newUser, 201, res);
  } catch (error: any) {
    logger.error('Registration error:', error);
    const msg = typeof error?.message === 'string' ? error.message : 'Error registering user';
    next(new AppError(msg, 500));
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    // Check if user exists & password is correct
    const user = await UserModel.findByEmail(email);
    
    if (!user || !(await UserModel.comparePassword(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    // If everything ok, send token to client
    createSendToken(user, 200, res);
  } catch (error) {
    logger.error('Login error:', error);
    next(new AppError('Error logging in', 500));
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // User is already available from the protect middleware
    res.status(200).json({
      status: 'success',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(new AppError('Error fetching user data', 500));
  }
};
