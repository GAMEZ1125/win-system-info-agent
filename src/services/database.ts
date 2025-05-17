import { DatabaseService } from './databaseService';
import { SystemInfoAttributes } from '../models/systemInfo';
import { logger } from '../utils/logger';

// Instancia compartida del servicio de base de datos
let databaseService: DatabaseService | null = null;

/**
 * Inicializa la conexión a la base de datos
 */
export async function initDatabase(): Promise<void> {
  try {
    if (!databaseService) {
      databaseService = new DatabaseService();
    }
    await databaseService.connect();
  } catch (error) {
    logger.error(`Error al inicializar la base de datos: ${error}`);
    throw error;
  }
}

/**
 * Guarda la información del sistema en la base de datos
 * @param data Datos del sistema a guardar
 */
export async function saveSystemInfo(data: SystemInfoAttributes): Promise<void> {
  try {
    if (!databaseService) {
      throw new Error('Base de datos no inicializada');
    }
    await databaseService.saveSystemInfo(data);
  } catch (error) {
    logger.error(`Error al guardar información del sistema: ${error}`);
    throw error;
  }
}

/**
 * Cierra la conexión a la base de datos
 */
export async function closeDatabase(): Promise<void> {
  try {
    if (databaseService) {
      await databaseService.close();
      databaseService = null;
    }
  } catch (error) {
    logger.error(`Error al cerrar la conexión a la base de datos: ${error}`);
  }
}

/**
 * Obtiene la instancia de DatabaseService
 * @returns La instancia de DatabaseService o null si no está inicializada
 */
export function getDatabaseService(): DatabaseService | null {
  return databaseService;
}