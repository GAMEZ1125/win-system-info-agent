"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const logger_1 = require("./utils/logger");
// Manejo de excepciones no capturadas
process.on('uncaughtException', (error) => {
    logger_1.logger.error(`Excepción no capturada: ${error.message}`);
    logger_1.logger.error(error.stack || '');
});
// Manejo de rechazos de promesas no capturados
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error(`Rechazo de promesa no manejado: ${reason}`);
});
// Crear y arrancar la aplicación
const app = new app_1.App();
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
