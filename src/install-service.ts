import { Service } from 'node-windows';
import * as path from 'path';

// Crear un nuevo servicio
const svc = new Service({
  name: 'SystemInfoAgent',
  description: 'Agente de recopilación de información del sistema Windows',
  script: path.join(__dirname, 'index.js')
});

// Escuchar los eventos de instalación
svc.on('install', () => {
  console.log('Servicio instalado correctamente');
  svc.start();
});

svc.on('start', () => {
  console.log('Servicio iniciado');
});

svc.on('error', (err) => {
  console.error('Error en el servicio:', err);
});

// Instalar el servicio
svc.install();