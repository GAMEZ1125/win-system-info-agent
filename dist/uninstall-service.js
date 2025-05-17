"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_windows_1 = require("node-windows");
const logger_1 = require("./utils/logger");
// Obtener la ruta al ejecutable actual
const exePath = process.execPath;
// Crear una referencia al servicio
const svc = new node_windows_1.Service({
    name: 'SystemInfoAgent',
    script: exePath
});
// Escuchar los eventos de desinstalación
svc.on('uninstall', () => {
    console.log('Servicio desinstalado correctamente');
    logger_1.logger.info('Servicio desinstalado correctamente');
});
svc.on('error', (err) => {
    console.error('Error al desinstalar el servicio:', err);
    logger_1.logger.error(`Error al desinstalar el servicio: ${err}`);
});
// Desinstalar el servicio
console.log('Desinstalando servicio...');
svc.uninstall();
