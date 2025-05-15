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
exports.getHardwareInfo = void 0;
const si = __importStar(require("systeminformation"));
const logger_1 = require("../utils/logger");
async function getHardwareInfo() {
    try {
        logger_1.logger.info('Collecting hardware information');
        // Obtener información de CPU
        const cpu = await si.cpu();
        // Obtener información de memoria
        const mem = await si.mem();
        // Obtener información de gráficos
        const graphics = await si.graphics();
        // Obtener información de discos
        const disks = await si.diskLayout();
        // Obtener información de sistema
        const system = await si.system();
        // Obtener información de BIOS
        const bios = await si.bios();
        // Formatear la información para retornarla
        return {
            // Solo incluimos información adicional que no está ya en systemInfo
            cpuCores: cpu.cores,
            cpuPhysicalCores: cpu.physicalCores,
            cpuSpeed: `${cpu.speed} GHz`,
            gpuInfo: graphics.controllers.map(c => `${c.vendor} ${c.model}`).join(', '),
            biosVersion: bios.version,
            biosReleaseDate: bios.releaseDate,
            biosVendor: bios.vendor,
            disksInfo: disks.map(disk => ({
                type: disk.type,
                size: `${Math.round(disk.size / 1073741824)} GB`,
                vendor: disk.vendor,
                model: disk.name
            }))
        };
    }
    catch (error) {
        logger_1.logger.error(`Error in getHardwareInfo: ${error}`);
        throw error;
    }
}
exports.getHardwareInfo = getHardwareInfo;
