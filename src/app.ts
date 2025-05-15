import { getSystemInfo } from './services/system-info';
import { getHardwareInfo } from './services/hardware-info';
import { initDatabase, saveSystemInfo, closeDatabase } from './services/database';
import { logger } from './utils/logger';
import * as schedule from 'node-schedule';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class App {
  private readonly interval: number = 6; // Horas entre actualizaciones

  constructor() {
    // Crear directorio para almacenamiento de logs
    const logDir = path.join(os.homedir(), 'AppData', 'Local', 'SystemInfoAgent', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  public async initialize(): Promise<void> {
    try {
      // Conectar a la base de datos
      await initDatabase();
      
      // Recopilar y guardar información del sistema
      await this.collectAndSaveSystemInfo();
      
      // Configurar trabajo programado para ejecutarse cada X horas
      this.scheduleSystemInfoCollection();
      
      logger.info('Aplicación iniciada correctamente');
    } catch (error) {
      logger.error(`Error al inicializar la aplicación: ${error}`);
    }
  }

  private async collectAndSaveSystemInfo(): Promise<void> {
    try {
      // Obtener información del sistema y hardware
      const systemInfo = await getSystemInfo();
      const hardwareInfo = await getHardwareInfo();
      
      // Combinar la información
      const deviceInfo = {
        ...systemInfo,
        // Ignoramos la información adicional de hardware que no está en el modelo
      };
      
      // Guardar en la base de datos
      await saveSystemInfo(deviceInfo);
      
      logger.info(`Información del sistema recopilada y guardada para: ${deviceInfo.computerName}`);
    } catch (error) {
      logger.error(`Error al recopilar o guardar información del sistema: ${error}`);
    }
  }

  private scheduleSystemInfoCollection(): void {
    // Programar la recopilación para que se ejecute cada X horas
    const job = schedule.scheduleJob(`0 */${this.interval} * * *`, async () => {
      logger.info(`Ejecutando recopilación programada de información del sistema`);
      await this.collectAndSaveSystemInfo();
    });
    
    logger.info(`Recopilación programada cada ${this.interval} horas`);
  }

  public async shutdown(): Promise<void> {
    try {
      // Cerrar conexión a la base de datos
      await closeDatabase();
      logger.info('Aplicación detenida correctamente');
    } catch (error) {
      logger.error(`Error al detener la aplicación: ${error}`);
    }
  }
}