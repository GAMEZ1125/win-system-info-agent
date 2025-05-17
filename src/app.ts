import { getSystemInfo } from './services/system-info';
import { getHardwareInfo } from './services/hardware-info';
import { initDatabase, saveSystemInfo, closeDatabase } from './services/database';
import { logger } from './utils/logger';
import * as schedule from 'node-schedule';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
// Importar las funciones y clases necesarias
import { testTimezones } from './utils/timezone-test';
import { DatabaseService } from './services/databaseService';
import { DateFormatter } from './utils/date-formatter'; // Añadir esta importación

// Eliminamos la importación de electron para evitar confusiones
// import { app as electronApp } from 'electron';

export class App {
  private readonly interval: number = 6; // Horas entre actualizaciones
  private job: schedule.Job | null = null;
  private notifyEnabled: boolean = true; // Flag para habilitar/deshabilitar notificaciones
  private notifyCallback: ((title: string, message: string) => void) | null = null;
  private databaseService: DatabaseService; // Añadir esta propiedad

  constructor(options?: { 
    notifyEnabled?: boolean;
    notifyCallback?: (title: string, message: string) => void;
  }) {
    // Permitir configurar si las notificaciones están habilitadas
    if (options && typeof options.notifyEnabled !== 'undefined') {
      this.notifyEnabled = options.notifyEnabled;
    }
    
    // Guardar la función de callback para notificaciones
    if (options && typeof options.notifyCallback === 'function') {
      this.notifyCallback = options.notifyCallback;
    }
    
    // Crear directorio para almacenamiento de logs
    const logDir = path.join(os.homedir(), 'AppData', 'Local', 'SystemInfoAgent', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Inicializar el servicio de base de datos
    this.databaseService = new DatabaseService();
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
      throw error; // Re-lanzar el error para manejarlo en el nivel superior
    }
  }

  // Hacer el método público para poder llamarlo desde la interfaz
  public async collectAndSaveSystemInfo(): Promise<any> {
    try {
      logger.info('Iniciando recopilación de información del sistema...');
      
      // Obtener información del sistema y hardware
      const systemInfo = await getSystemInfo();
      const hardwareInfo = await getHardwareInfo();
      
      // Combinar la información
      const deviceInfo = {
        ...systemInfo,
        // Se ignora la información adicional de hardware que no está en el modelo
      };
      
      // Guardar en la base de datos
      await saveSystemInfo(deviceInfo);
      
      logger.info(`Información del sistema recopilada y guardada para: ${deviceInfo.computerName}`);
      return deviceInfo;
    } catch (error) {
      logger.error(`Error al recopilar o guardar información del sistema: ${error}`);
      throw error;
    }
  }

  private scheduleSystemInfoCollection(): void {
    // Cancelar el trabajo anterior si existe
    if (this.job) {
      this.job.cancel();
    }
    
    // Programar la recopilación para que se ejecute cada X horas
    this.job = schedule.scheduleJob(`0 */${this.interval} * * *`, async () => {
      logger.info(`Ejecutando recopilación programada de información del sistema`);
      try {
        const info = await this.collectAndSaveSystemInfo();
        
        // Si las notificaciones están habilitadas y hay una función de callback
        if (this.notifyEnabled && this.notifyCallback) {
          this.notifyCallback(
            'Recopilación Automática', 
            `Se ha recopilado la información del sistema ${info.computerName} correctamente.`
          );
        }
      } catch (error) {
        logger.error(`Error en la recopilación programada: ${error}`);
      }
    });
    
    logger.info(`Recopilación programada cada ${this.interval} horas`);
  }

  // Método para habilitar/deshabilitar notificaciones
  public setNotificationsEnabled(enabled: boolean): void {
    this.notifyEnabled = enabled;
  }
  
  // Método para establecer el callback de notificaciones
  public setNotificationCallback(callback: (title: string, message: string) => void): void {
    this.notifyCallback = callback;
  }

  public async shutdown(): Promise<void> {
    try {
      // Cancelar el trabajo programado
      if (this.job) {
        this.job.cancel();
        this.job = null;
      }
      
      // Cerrar conexión a la base de datos
      await closeDatabase();
      logger.info('Aplicación detenida correctamente');
    } catch (error) {
      logger.error(`Error al detener la aplicación: ${error}`);
    }
  }

  // Añadir este método a la clase App
  public async testDateTimeConfiguration(): Promise<void> {
    try {
      // Mostrar información básica de fecha y hora
      const now = new Date();
      logger.info(`Fecha del sistema: ${now.toString()}`);
      logger.info(`Timezone offset en minutos: ${now.getTimezoneOffset()}`);
      
      // Si tienes DateFormatter disponible
      if (typeof DateFormatter !== 'undefined') {
        const colombiaDate = DateFormatter.getColombiaDate();
        logger.info(`Fecha Colombia: ${colombiaDate.toString()}`);
      }
      
      // Verificar la fecha en la base de datos mediante una consulta simple
      try {
        // Crear un registro de prueba
        const testData = await this.collectAndSaveSystemInfo();
        logger.info(`Registro creado con fechas: ${JSON.stringify({
          createdAt: testData.createdAt,
          updatedAt: testData.updatedAt
        })}`);
      } catch (dbError) {
        logger.error(`Error al verificar fechas en DB: ${dbError}`);
      }
    } catch (error) {
      logger.error(`Error en prueba de configuración de fecha/hora: ${error}`);
    }
  }
}