import { App } from './app';
import { logger } from './utils/logger';
import { execFileSync } from 'child_process';
import * as path from 'path';

// Verificar los argumentos de línea de comandos
const args = process.argv.slice(2);

// Si estamos instalando el servicio
if (args.includes('--install-service')) {
  const scriptPath = path.join(__dirname, 'install-service.js');
  try {
    execFileSync('node', [scriptPath], { stdio: 'inherit' });
    process.exit(0);
  } catch (error) {
    console.error('Error al instalar el servicio:', error);
    process.exit(1);
  }
}

// Si estamos desinstalando el servicio
if (args.includes('--uninstall-service')) {
  const scriptPath = path.join(__dirname, 'uninstall-service.js');
  try {
    execFileSync('node', [scriptPath], { stdio: 'inherit' });
    process.exit(0);
  } catch (error) {
    console.error('Error al desinstalar el servicio:', error);
    process.exit(1);
  }
}

// Función dummy para notificaciones en modo servicio
function serviceNotification(title: string, message: string) {
  // En modo servicio, solo lo registramos pero no mostramos notificaciones visuales
  logger.info(`Notificación: ${title} - ${message}`);
}

// Si se solicita una recopilación inmediata
if (args.includes('--collect-now')) {
  logger.info('Iniciando recopilación inmediata desde línea de comandos...');
  
  // Crear instancia de la aplicación sin notificaciones visuales
  const app = new App({ 
    notifyEnabled: false,
    notifyCallback: serviceNotification
  });
  
  // Inicializar
  app.initialize()
    .then(() => app.collectAndSaveSystemInfo())
    .then(() => {
      logger.info('Recopilación inmediata completada correctamente');
      process.exit(0);
    })
    .catch((error) => {
      logger.error(`Error en recopilación inmediata: ${error}`);
      process.exit(1);
    });
} else if (args.includes('--service') || !process.env.ELECTRON_RUN_AS_NODE) {
  // El código existente para inicio del servicio
  logger.info('Iniciando el agente de recopilación de información del sistema...');
  
  // Crear instancia de la aplicación con notificaciones habilitadas pero sin mostrar UI
  const app = new App({ 
    notifyEnabled: true,
    notifyCallback: serviceNotification
  });

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
  
  logger.info('Agente de recopilación iniciado en modo servicio');
} else {
  logger.info('Ejecutando en modo no-servicio');
}

// Manejo de excepciones no capturadas
process.on('uncaughtException', (error) => {
  logger.error(`Excepción no capturada: ${error.message}`);
  logger.error(error.stack || '');
});

// Manejo de rechazos de promesas no capturados
process.on('unhandledRejection', (reason) => {
  logger.error(`Rechazo de promesa no manejado: ${reason}`);
});