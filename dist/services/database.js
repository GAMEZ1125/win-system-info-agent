"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseService = exports.closeDatabase = exports.saveSystemInfo = exports.initDatabase = void 0;
const databaseService_1 = require("./databaseService");
const logger_1 = require("../utils/logger");
// Instancia compartida del servicio de base de datos
let databaseService = null;
/**
 * Inicializa la conexión a la base de datos
 */
async function initDatabase() {
    try {
        if (!databaseService) {
            databaseService = new databaseService_1.DatabaseService();
        }
        await databaseService.connect();
    }
    catch (error) {
        logger_1.logger.error(`Error al inicializar la base de datos: ${error}`);
        throw error;
    }
}
exports.initDatabase = initDatabase;
/**
 * Guarda la información del sistema en la base de datos
 * @param data Datos del sistema a guardar
 */
async function saveSystemInfo(data) {
    try {
        if (!databaseService) {
            throw new Error('Base de datos no inicializada');
        }
        await databaseService.saveSystemInfo(data);
    }
    catch (error) {
        logger_1.logger.error(`Error al guardar información del sistema: ${error}`);
        throw error;
    }
}
exports.saveSystemInfo = saveSystemInfo;
/**
 * Cierra la conexión a la base de datos
 */
async function closeDatabase() {
    try {
        if (databaseService) {
            await databaseService.close();
            databaseService = null;
        }
    }
    catch (error) {
        logger_1.logger.error(`Error al cerrar la conexión a la base de datos: ${error}`);
    }
}
exports.closeDatabase = closeDatabase;
/**
 * Obtiene la instancia de DatabaseService
 * @returns La instancia de DatabaseService o null si no está inicializada
 */
function getDatabaseService() {
    return databaseService;
}
exports.getDatabaseService = getDatabaseService;
