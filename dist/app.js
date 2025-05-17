"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const system_info_1 = require("./services/system-info");
const hardware_info_1 = require("./services/hardware-info");
const database_1 = require("./services/database");
const logger_1 = require("./utils/logger");
const schedule = __importStar(require("node-schedule"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
// Eliminamos la importación de electron para evitar confusiones
// import { app as electronApp } from 'electron';
class App {
    constructor(options) {
        this.interval = 6; // Horas entre actualizaciones
        this.job = null;
        this.notifyEnabled = true; // Flag para habilitar/deshabilitar notificaciones
        this.notifyCallback = null;
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
    }
    async initialize() {
        try {
            // Conectar a la base de datos
            await (0, database_1.initDatabase)();
            // Recopilar y guardar información del sistema
            await this.collectAndSaveSystemInfo();
            // Configurar trabajo programado para ejecutarse cada X horas
            this.scheduleSystemInfoCollection();
            logger_1.logger.info('Aplicación iniciada correctamente');
        }
        catch (error) {
            logger_1.logger.error(`Error al inicializar la aplicación: ${error}`);
            throw error; // Re-lanzar el error para manejarlo en el nivel superior
        }
    }
    // Hacer el método público para poder llamarlo desde la interfaz
    async collectAndSaveSystemInfo() {
        try {
            logger_1.logger.info('Iniciando recopilación de información del sistema...');
            // Obtener información del sistema y hardware
            const systemInfo = await (0, system_info_1.getSystemInfo)();
            const hardwareInfo = await (0, hardware_info_1.getHardwareInfo)();
            // Combinar la información
            const deviceInfo = {
                ...systemInfo,
                // Se ignora la información adicional de hardware que no está en el modelo
            };
            // Guardar en la base de datos
            await (0, database_1.saveSystemInfo)(deviceInfo);
            logger_1.logger.info(`Información del sistema recopilada y guardada para: ${deviceInfo.computerName}`);
            return deviceInfo;
        }
        catch (error) {
            logger_1.logger.error(`Error al recopilar o guardar información del sistema: ${error}`);
            throw error;
        }
    }
    scheduleSystemInfoCollection() {
        // Cancelar el trabajo anterior si existe
        if (this.job) {
            this.job.cancel();
        }
        // Programar la recopilación para que se ejecute cada X horas
        this.job = schedule.scheduleJob(`0 */${this.interval} * * *`, async () => {
            logger_1.logger.info(`Ejecutando recopilación programada de información del sistema`);
            try {
                const info = await this.collectAndSaveSystemInfo();
                // Si las notificaciones están habilitadas y hay una función de callback
                if (this.notifyEnabled && this.notifyCallback) {
                    this.notifyCallback('Recopilación Automática', `Se ha recopilado la información del sistema ${info.computerName} correctamente.`);
                }
            }
            catch (error) {
                logger_1.logger.error(`Error en la recopilación programada: ${error}`);
            }
        });
        logger_1.logger.info(`Recopilación programada cada ${this.interval} horas`);
    }
    // Método para habilitar/deshabilitar notificaciones
    setNotificationsEnabled(enabled) {
        this.notifyEnabled = enabled;
    }
    // Método para establecer el callback de notificaciones
    setNotificationCallback(callback) {
        this.notifyCallback = callback;
    }
    async shutdown() {
        try {
            // Cancelar el trabajo programado
            if (this.job) {
                this.job.cancel();
                this.job = null;
            }
            // Cerrar conexión a la base de datos
            await (0, database_1.closeDatabase)();
            logger_1.logger.info('Aplicación detenida correctamente');
        }
        catch (error) {
            logger_1.logger.error(`Error al detener la aplicación: ${error}`);
        }
    }
}
exports.App = App;
