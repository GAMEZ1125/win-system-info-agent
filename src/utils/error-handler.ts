import { logger } from './logger';

export function handleError(error: Error, context: string = 'unknown'): void {
  logger.error(`Error in ${context}: ${error.message}`);
  if (error.stack) {
    logger.error(`Stack trace: ${error.stack}`);
  }
}

export function handleWarning(message: string, context: string = 'unknown'): void {
  logger.warn(`Warning in ${context}: ${message}`);
}