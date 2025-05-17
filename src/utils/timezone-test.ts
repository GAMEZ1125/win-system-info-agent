import { DateFormatter } from './date-formatter';
import { logger } from './logger';
import { Sequelize } from 'sequelize'; // Añadir esta importación

/**
 * Función para verificar las zonas horarias y realizar diagnósticos
 */
export async function testTimezones(sequelize: Sequelize): Promise<void> {
  try {
    logger.info('======= TEST DE ZONA HORARIA =======');
    
    // Verificar zona horaria del sistema
    const systemDate = new Date();
    logger.info(`Fecha del sistema: ${systemDate.toString()}`);
    logger.info(`Fecha ISO: ${systemDate.toISOString()}`);
    logger.info(`UTC String: ${systemDate.toUTCString()}`);
    logger.info(`Timezone offset en minutos: ${systemDate.getTimezoneOffset()}`);
    
    // Verificar zona horaria de Colombia
    const colombiaDate = DateFormatter.getColombiaDate();
    logger.info(`Fecha Colombia: ${colombiaDate.toString()}`);
    logger.info(`Fecha Colombia formateada: ${DateFormatter.formatToColombiaTime(colombiaDate)}`);
    
    // Verificar configuración de MySQL
    if (sequelize) {
      try {
        const [results] = await sequelize.query("SELECT NOW() as now, @@session.time_zone, @@global.time_zone");
        logger.info(`MySQL NOW(): ${JSON.stringify(results)}`);
      } catch (dbError) {
        logger.error(`Error al consultar timezone MySQL: ${dbError}`);
      }
    }
    
    logger.info('====================================');
  } catch (error) {
    logger.error(`Error en test de zona horaria: ${error}`);
  }
}