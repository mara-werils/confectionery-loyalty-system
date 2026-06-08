import winston from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';
import { config } from '../config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const transports: winston.transport[] = [
  new winston.transports.Console(),
  ...(config.app.env === 'production'
    ? [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
      ]
    : []),
];

if (process.env.LOGTAIL_TOKEN) {
  const logtail = new Logtail(process.env.LOGTAIL_TOKEN);
  transports.push(new LogtailTransport(logtail));
}

export const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    config.app.env === 'development' ? colorize() : winston.format.uncolorize(),
    logFormat
  ),
  transports,
});












