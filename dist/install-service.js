"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_windows_1 = require("node-windows");
const logger_1 = require("./utils/logger");
const child_process_1 = require("child_process");
const util_1 = require("util");
// Promisificar exec para un manejo más limpio
const exec = (0, util_1.promisify)(child_process_1.exec);
// Obtener la ruta al ejecutable actual
const exePath = process.execPath;
// Nombre del servicio en una constante para referencia consistente
const SERVICE_NAME = 'SystemInfoAgent';
// Crear un nuevo servicio con las opciones correctas según la definición de tipos
const svc = new node_windows_1.Service({
    name: SERVICE_NAME,
    description: 'Agente de recopilación de información del sistema Windows',
    script: exePath
});
// Escuchar los eventos de instalación
svc.on('install', async () => {
    console.log('Servicio instalado correctamente');
    logger_1.logger.info('Servicio instalado correctamente');
    // Modificar el binPath del servicio para agregar el argumento --service
    try {
        // Consultar la configuración actual del servicio
        const scQueryCmd = `sc qc "${SERVICE_NAME}"`;
        const { stdout } = await exec(scQueryCmd);
        // Extraer el BINARY_PATH_NAME
        const match = stdout.match(/BINARY_PATH_NAME\s+:\s+(.+)/);
        if (match && match[1]) {
            const currentPath = match[1].trim();
            // Verificar si ya tiene los argumentos
            if (!currentPath.includes('--service')) {
                // Agregar el argumento --service
                const scConfigCmd = `sc config "${SERVICE_NAME}" binPath= "${currentPath} --service"`;
                await exec(scConfigCmd);
                console.log('Servicio configurado con argumentos correctamente');
                logger_1.logger.info('Servicio configurado con argumentos correctamente');
            }
        }
        else {
            console.error('No se pudo encontrar BINARY_PATH_NAME en la configuración del servicio');
            logger_1.logger.error('No se pudo encontrar BINARY_PATH_NAME en la configuración del servicio');
        }
    }
    catch (error) {
        console.error('Error al configurar argumentos del servicio:', error);
        logger_1.logger.error(`Error al configurar argumentos del servicio: ${error}`);
    }
    // Iniciar el servicio en cualquier caso
    try {
        svc.start();
    }
    catch (startError) {
        console.error('Error al iniciar el servicio:', startError);
        logger_1.logger.error(`Error al iniciar el servicio: ${startError}`);
    }
});
svc.on('alreadyinstalled', () => {
    console.log('El servicio ya se encuentra instalado');
    logger_1.logger.info('El servicio ya se encuentra instalado');
});
svc.on('start', () => {
    console.log('Servicio iniciado');
    logger_1.logger.info('Servicio iniciado');
});
svc.on('error', (err) => {
    console.error('Error en el servicio:', err);
    logger_1.logger.error(`Error en el servicio: ${err}`);
});
// Instalar el servicio
console.log('Instalando servicio...');
svc.install();
