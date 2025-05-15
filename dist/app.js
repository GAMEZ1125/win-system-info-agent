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
class App {
    constructor() {
        this.interval = 6; // Horas entre actualizaciones
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
        }
    }
    async collectAndSaveSystemInfo() {
        try {
            // Obtener información del sistema y hardware
            const systemInfo = await (0, system_info_1.getSystemInfo)();
            const hardwareInfo = await (0, hardware_info_1.getHardwareInfo)();
            // Combinar la información
            const deviceInfo = {
                ...systemInfo,
                // Ignoramos la información adicional de hardware que no está en el modelo
            };
            // Guardar en la base de datos
            await (0, database_1.saveSystemInfo)(deviceInfo);
            logger_1.logger.info(`Información del sistema recopilada y guardada para: ${deviceInfo.computerName}`);
        }
        catch (error) {
            logger_1.logger.error(`Error al recopilar o guardar información del sistema: ${error}`);
        }
    }
    scheduleSystemInfoCollection() {
        // Programar la recopilación para que se ejecute cada X horas
        const job = schedule.scheduleJob(`0 */${this.interval} * * *`, async () => {
            logger_1.logger.info(`Ejecutando recopilación programada de información del sistema`);
            await this.collectAndSaveSystemInfo();
        });
        logger_1.logger.info(`Recopilación programada cada ${this.interval} horas`);
    }
    async shutdown() {
        try {
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
