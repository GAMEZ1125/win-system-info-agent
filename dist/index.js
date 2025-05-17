"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const logger_1 = require("./utils/logger");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
// Verificar los argumentos de línea de comandos
const args = process.argv.slice(2);
// Si estamos instalando el servicio
if (args.includes('--install-service')) {
    const scriptPath = path.join(__dirname, 'install-service.js');
    try {
        (0, child_process_1.execFileSync)('node', [scriptPath], { stdio: 'inherit' });
        process.exit(0);
    }
    catch (error) {
        console.error('Error al instalar el servicio:', error);
        process.exit(1);
    }
}
// Si estamos desinstalando el servicio
if (args.includes('--uninstall-service')) {
    const scriptPath = path.join(__dirname, 'uninstall-service.js');
    try {
        (0, child_process_1.execFileSync)('node', [scriptPath], { stdio: 'inherit' });
        process.exit(0);
    }
    catch (error) {
        console.error('Error al desinstalar el servicio:', error);
        process.exit(1);
    }
}
// Función dummy para notificaciones en modo servicio
function serviceNotification(title, message) {
    // En modo servicio, solo lo registramos pero no mostramos notificaciones visuales
    logger_1.logger.info(`Notificación: ${title} - ${message}`);
}
// Si se solicita una recopilación inmediata
if (args.includes('--collect-now')) {
    logger_1.logger.info('Iniciando recopilación inmediata desde línea de comandos...');
    // Crear instancia de la aplicación sin notificaciones visuales
    const app = new app_1.App({
        notifyEnabled: false,
        notifyCallback: serviceNotification
    });
    // Inicializar
    app.initialize()
        .then(() => app.collectAndSaveSystemInfo())
        .then(() => {
        logger_1.logger.info('Recopilación inmediata completada correctamente');
        process.exit(0);
    })
        .catch((error) => {
        logger_1.logger.error(`Error en recopilación inmediata: ${error}`);
        process.exit(1);
    });
}
else if (args.includes('--service') || !process.env.ELECTRON_RUN_AS_NODE) {
    // El código existente para inicio del servicio
    logger_1.logger.info('Iniciando el agente de recopilación de información del sistema...');
    // Crear instancia de la aplicación con notificaciones habilitadas pero sin mostrar UI
    const app = new app_1.App({
        notifyEnabled: true,
        notifyCallback: serviceNotification
    });
    // Manejar señales de cierre
    process.on('SIGINT', async () => {
        logger_1.logger.info('Recibida señal de interrupción, cerrando aplicación...');
        await app.shutdown();
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        logger_1.logger.info('Recibida señal de terminación, cerrando aplicación...');
        await app.shutdown();
        process.exit(0);
    });
    // Inicializar la aplicación
    app.initialize().catch((error) => {
        logger_1.logger.error(`Error al inicializar la aplicación: ${error}`);
        process.exit(1);
    });
    logger_1.logger.info('Agente de recopilación iniciado en modo servicio');
}
else {
    logger_1.logger.info('Ejecutando en modo no-servicio');
}
// Manejo de excepciones no capturadas
process.on('uncaughtException', (error) => {
    logger_1.logger.error(`Excepción no capturada: ${error.message}`);
    logger_1.logger.error(error.stack || '');
});
// Manejo de rechazos de promesas no capturados
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error(`Rechazo de promesa no manejado: ${reason}`);
});
