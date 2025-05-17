import { Sequelize } from 'sequelize';
import { dbConfig } from '../config/database';
import { SystemInfo } from '../models/systemInfo';
import { SystemInfoAttributes } from '../models/systemInfo';
import { logger } from '../utils/logger';
import { DateFormatter } from '../utils/date-formatter';

export class DatabaseService {
  private sequelize: Sequelize;

  constructor() {
    this.sequelize = new Sequelize(
      dbConfig.database,
      dbConfig.user,
      dbConfig.password,
      {
        host: dbConfig.host,
        dialect: 'mysql',
        logging: false,
        // Usar la utilidad para obtener la zona horaria correcta
        timezone: DateFormatter.getColombiaTimeZoneOffset(),
        dialectOptions: {
          useUTC: false,
          // Asegurar que las fechas se manejen como strings
          dateStrings: true,
          typeCast: function (field: any, next: any) {
            if (field.type === 'DATETIME' || field.type === 'TIMESTAMP') {
              return field.string();
            }
            return next();
          },
          // Añadir configuración específica para MySQL
          connectTimeout: 60000,
          // Añadir configuración explícita de timezone
          timezone: DateFormatter.getColombiaTimeZoneOffset()
        }
      }
    );
    
    // Inicializar modelos
    SystemInfo.initialize(this.sequelize);
  }

  public async connect(): Promise<void> {
    try {
      await this.sequelize.authenticate();
      logger.info('Conexión a la base de datos establecida correctamente');
      
      // Establecer timezone con consulta SQL explícita
      const timeZone = DateFormatter.getColombiaTimeZoneOffset();
      await this.sequelize.query(`SET time_zone = '${timeZone}'`);
      logger.info(`Zona horaria de la base de datos configurada a ${timeZone} (Colombia)`);
      
      // Verificar la configuración de timezone actual
      const [results] = await this.sequelize.query("SELECT @@session.time_zone, @@global.time_zone");
      logger.info(`Configuración de timezone: ${JSON.stringify(results)}`);
      
      // Sincronizar modelos
      await this.sequelize.sync({ alter: true });
      logger.info('Modelos sincronizados con la base de datos');
    } catch (error) {
      logger.error(`Error al conectar a la base de datos: ${error}`);
      throw error;
    }
  }

  public async saveSystemInfo(data: SystemInfoAttributes): Promise<void> {
    try {
      logger.info('Guardando información del sistema en la base de datos');
      
      // Buscar si ya existe un registro con el mismo clientId
      const existingRecord = await SystemInfo.findOne({
        where: { clientId: data.clientId }
      });
      
      if (existingRecord) {
        // Actualizar registro existente
        await existingRecord.update(data);
        logger.info(`Información actualizada para el equipo: ${data.computerName}`);
      } else {
        // Crear nuevo registro
        await SystemInfo.create(data);
        logger.info(`Nueva información guardada para el equipo: ${data.computerName}`);
      }
    } catch (error) {
      logger.error(`Error al guardar información en la base de datos: ${error}`);
      throw error;
    }
  }

  public async close(): Promise<void> {
    try {
      await this.sequelize.close();
      logger.info('Conexión a la base de datos cerrada');
    } catch (error) {
      logger.error(`Error al cerrar la conexión a la base de datos: ${error}`);
    }
  }

  // Agregar este método a la clase DatabaseService
  public getSequelize(): Sequelize {
    return this.sequelize;
  }
}