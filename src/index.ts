import { App } from './app';
import { logger } from './utils/logger';

// Manejo de excepciones no capturadas
process.on('uncaughtException', (error) => {
  logger.error(`Excepción no capturada: ${error.message}`);
  logger.error(error.stack || '');
});

// Manejo de rechazos de promesas no capturados
process.on('unhandledRejection', (reason) => {
  logger.error(`Rechazo de promesa no manejado: ${reason}`);
});

// Crear y arrancar la aplicación
const app = new App();

// Manejar señales de cierre
process.on('SIGINT', async () => {
  logger.info('Recibida señal de interrupción, cerrando aplicación...');
  await app.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Recibida señal de terminación, cerrando aplicación...');
  await app.shutdown();
  process.exit(0);
});

// Inicializar la aplicación
app.initialize().catch((error) => {
  logger.error(`Error al inicializar la aplicación: ${error}`);
  process.exit(1);
});