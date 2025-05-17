import { Service } from 'node-windows';
import * as path from 'path';
import { logger } from './utils/logger';

// Obtener la ruta al ejecutable actual
const exePath = process.execPath;

// Crear una referencia al servicio
const svc = new Service({
  name: 'SystemInfoAgent',
  script: exePath
});

// Escuchar los eventos de desinstalación
svc.on('uninstall', () => {
  console.log('Servicio desinstalado correctamente');
  logger.info('Servicio desinstalado correctamente');
});

svc.on('error', (err) => {
  console.error('Error al desinstalar el servicio:', err);
  logger.error(`Error al desinstalar el servicio: ${err}`);
});

// Desinstalar el servicio
console.log('Desinstalando servicio...');
svc.uninstall();