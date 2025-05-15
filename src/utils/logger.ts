import * as winston from 'winston';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// Crear directorio para logs si no existe
const logDir = path.join(os.homedir(), 'AppData', 'Local', 'SystemInfoAgent', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Crear un formato que no incluya información sensible
const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Crear logger
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    logFormat
  ),
  transports: [
    // Guardar logs en archivo rotativo (max 5MB, max 3 archivos)
    new winston.transports.File({
      filename: path.join(logDir, 'system-info-agent.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      tailable: true
    })
  ],
  // No mostrar excepciones en la consola
  silent: process.env.NODE_ENV === 'production'
});

// Si no estamos en producción, añadir transporte de consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      logFormat
    )
  }));
}