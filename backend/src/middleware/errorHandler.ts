import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { errorResponse } from '../utils/response';

export class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode = 400, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFoundHandler = (req: Request, res: Response) => {
  return errorResponse(res, `Route ${req.originalUrl} not found`, 'NOT_FOUND', 404);
};

export const errorHandler = (err: Error, req: Request, res: Response) => {
  logger.error(err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return errorResponse(
      res,
      'Validation error',
      'VALIDATION_ERROR',
      400,
      err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
    );
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return errorResponse(
          res,
          'A record with this value already exists',
          'DUPLICATE_ENTRY',
          409
        );
      case 'P2025':
        return errorResponse(res, 'Record not found', 'NOT_FOUND', 404);
      default:
        return errorResponse(res, 'Database error', 'DATABASE_ERROR', 500);
    }
  }

  // Handle operational errors
  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.code, err.statusCode);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token', 'INVALID_TOKEN', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token expired', 'TOKEN_EXPIRED', 401);
  }

  // Generic error
  return errorResponse(
    res,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    'INTERNAL_ERROR',
    500
  );
};




