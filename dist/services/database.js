"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.saveSystemInfo = exports.initDatabase = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const systemInfo_1 = require("../models/systemInfo");
const logger_1 = require("../utils/logger");
let sequelizeConnection = null;
async function initDatabase() {
    try {
        sequelizeConnection = new sequelize_1.Sequelize(database_1.dbConfig.database, database_1.dbConfig.user, database_1.dbConfig.password, {
            host: database_1.dbConfig.host,
            dialect: 'mysql',
            logging: false
        });
        await sequelizeConnection.authenticate();
        logger_1.logger.info('Database connection established successfully');
        // Inicializar modelos
        systemInfo_1.SystemInfo.initialize(sequelizeConnection);
        // Sincronizar modelos con la base de datos
        await sequelizeConnection.sync({ alter: true });
        logger_1.logger.info('Database models synchronized');
        return sequelizeConnection;
    }
    catch (error) {
        logger_1.logger.error(`Error connecting to database: ${error}`);
        throw error;
    }
}
exports.initDatabase = initDatabase;
async function saveSystemInfo(data) {
    try {
        if (!sequelizeConnection) {
            await initDatabase();
        }
        // Verificar si ya existe un registro con el mismo clientId
        const existingRecord = await systemInfo_1.SystemInfo.findOne({
            where: { clientId: data.clientId }
        });
        if (existingRecord) {
            // Actualizar registro existente
            await existingRecord.update(data);
            logger_1.logger.info(`Information updated for computer: ${data.computerName}`);
        }
        else {
            // Crear nuevo registro
            await systemInfo_1.SystemInfo.create(data);
            logger_1.logger.info(`New information saved for computer: ${data.computerName}`);
        }
    }
    catch (error) {
        logger_1.logger.error(`Error saving system information: ${error}`);
        throw error;
    }
}
exports.saveSystemInfo = saveSystemInfo;
async function closeDatabase() {
    try {
        if (sequelizeConnection) {
            await sequelizeConnection.close();
            logger_1.logger.info('Database connection closed');
        }
    }
    catch (error) {
        logger_1.logger.error(`Error closing database connection: ${error}`);
    }
}
exports.closeDatabase = closeDatabase;
