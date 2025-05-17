"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testTimezones = void 0;
const date_formatter_1 = require("./date-formatter");
const logger_1 = require("./logger");
/**
 * Función para verificar las zonas horarias y realizar diagnósticos
 */
async function testTimezones(sequelize) {
    try {
        logger_1.logger.info('======= TEST DE ZONA HORARIA =======');
        // Verificar zona horaria del sistema
        const systemDate = new Date();
        logger_1.logger.info(`Fecha del sistema: ${systemDate.toString()}`);
        logger_1.logger.info(`Fecha ISO: ${systemDate.toISOString()}`);
        logger_1.logger.info(`UTC String: ${systemDate.toUTCString()}`);
        logger_1.logger.info(`Timezone offset en minutos: ${systemDate.getTimezoneOffset()}`);
        // Verificar zona horaria de Colombia
        const colombiaDate = date_formatter_1.DateFormatter.getColombiaDate();
        logger_1.logger.info(`Fecha Colombia: ${colombiaDate.toString()}`);
        logger_1.logger.info(`Fecha Colombia formateada: ${date_formatter_1.DateFormatter.formatToColombiaTime(colombiaDate)}`);
        // Verificar configuración de MySQL
        if (sequelize) {
            try {
                const [results] = await sequelize.query("SELECT NOW() as now, @@session.time_zone, @@global.time_zone");
                logger_1.logger.info(`MySQL NOW(): ${JSON.stringify(results)}`);
            }
            catch (dbError) {
                logger_1.logger.error(`Error al consultar timezone MySQL: ${dbError}`);
            }
        }
        logger_1.logger.info('====================================');
    }
    catch (error) {
        logger_1.logger.error(`Error en test de zona horaria: ${error}`);
    }
}
exports.testTimezones = testTimezones;
