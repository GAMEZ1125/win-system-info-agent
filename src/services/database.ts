import { Sequelize } from 'sequelize';
import { dbConfig } from '../config/database';
import { SystemInfo, SystemInfoAttributes } from '../models/systemInfo';
import { logger } from '../utils/logger';

let sequelizeConnection: Sequelize | null = null;

export async function initDatabase() {
    try {
        sequelizeConnection = new Sequelize(
            dbConfig.database,
            dbConfig.user,
            dbConfig.password,
            {
                host: dbConfig.host,
                dialect: 'mysql',
                logging: false
            }
        );

        await sequelizeConnection.authenticate();
        logger.info('Database connection established successfully');

        // Inicializar modelos
        SystemInfo.initialize(sequelizeConnection);
        
        // Sincronizar modelos con la base de datos
        await sequelizeConnection.sync({ alter: true });
        logger.info('Database models synchronized');

        return sequelizeConnection;
    } catch (error) {
        logger.error(`Error connecting to database: ${error}`);
        throw error;
    }
}

export async function saveSystemInfo(data: SystemInfoAttributes) {
    try {
        if (!sequelizeConnection) {
            await initDatabase();
        }

        // Verificar si ya existe un registro con el mismo clientId
        const existingRecord = await SystemInfo.findOne({
            where: { clientId: data.clientId }
        });

        if (existingRecord) {
            // Actualizar registro existente
            await existingRecord.update(data);
            logger.info(`Information updated for computer: ${data.computerName}`);
        } else {
            // Crear nuevo registro
            await SystemInfo.create(data);
            logger.info(`New information saved for computer: ${data.computerName}`);
        }
    } catch (error) {
        logger.error(`Error saving system information: ${error}`);
        throw error;
    }
}

export async function closeDatabase() {
    try {
        if (sequelizeConnection) {
            await sequelizeConnection.close();
            logger.info('Database connection closed');
        }
    } catch (error) {
        logger.error(`Error closing database connection: ${error}`);
    }
}