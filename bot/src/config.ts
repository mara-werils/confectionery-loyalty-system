import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  botToken: process.env.BOT_TOKEN || '',
  apiUrl: process.env.API_URL || 'http://localhost:3000/api/v1',
  miniAppUrl: process.env.MINI_APP_URL || 'https://sweet-loyalty.netlify.app',
  defaultLang: (process.env.DEFAULT_LANG || 'ru') as 'ru' | 'kz' | 'en',
};

export function validateConfig(): void {
  if (!config.botToken) {
    throw new Error('BOT_TOKEN is required in environment variables');
  }
  if (!config.apiUrl) {
    throw new Error('API_URL is required in environment variables');
  }
  if (!config.miniAppUrl) {
    throw new Error('MINI_APP_URL is required in environment variables');
  }
}
