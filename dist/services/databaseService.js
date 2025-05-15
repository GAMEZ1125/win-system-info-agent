"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const systemInfo_1 = require("../models/systemInfo");
const logger_1 = require("../utils/logger");
class DatabaseService {
    constructor() {
        this.sequelize = new sequelize_1.Sequelize(database_1.dbConfig.database, database_1.dbConfig.user, database_1.dbConfig.password, {
            host: database_1.dbConfig.host,
            dialect: 'mysql',
            logging: false,
        });
        // Inicializar modelos
        systemInfo_1.SystemInfo.initialize(this.sequelize);
    }
    async connect() {
        try {
            await this.sequelize.authenticate();
            logger_1.logger.info('Conexión a la base de datos establecida correctamente');
            // Sincronizar modelos (no forzar recreación de tablas en producción)
            await this.sequelize.sync({ alter: true });
            logger_1.logger.info('Modelos sincronizados con la base de datos');
        }
        catch (error) {
            logger_1.logger.error(`Error al conectar a la base de datos: ${error}`);
            throw error;
        }
    }
    async saveSystemInfo(data) {
        try {
            logger_1.logger.info('Guardando información del sistema en la base de datos');
            // Buscar si ya existe un registro con el mismo clientId
            const existingRecord = await systemInfo_1.SystemInfo.findOne({
                where: { clientId: data.clientId }
            });
            if (existingRecord) {
                // Actualizar registro existente
                await existingRecord.update(data);
                logger_1.logger.info(`Información actualizada para el equipo: ${data.computerName}`);
            }
            else {
                // Crear nuevo registro
                await systemInfo_1.SystemInfo.create(data);
                logger_1.logger.info(`Nueva información guardada para el equipo: ${data.computerName}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`Error al guardar información en la base de datos: ${error}`);
            throw error;
        }
    }
    async close() {
        try {
            await this.sequelize.close();
            logger_1.logger.info('Conexión a la base de datos cerrada');
        }
        catch (error) {
            logger_1.logger.error(`Error al cerrar la conexión a la base de datos: ${error}`);
        }
    }
}
exports.DatabaseService = DatabaseService;
