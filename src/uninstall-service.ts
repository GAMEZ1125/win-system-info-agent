import { Service } from 'node-windows';
import * as path from 'path';

// Crear una referencia al servicio
const svc = new Service({
  name: 'SystemInfoAgent',
  script: path.join(__dirname, 'index.js')
});

// Escuchar los eventos de desinstalación
svc.on('uninstall', () => {
  console.log('Servicio desinstalado correctamente');
});

svc.on('error', (err) => {
  console.error('Error al desinstalar el servicio:', err);
});

// Desinstalar el servicio
svc.uninstall();