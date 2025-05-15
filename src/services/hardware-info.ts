import * as si from 'systeminformation';
import { logger } from '../utils/logger';

export async function getHardwareInfo() {
    try {
        logger.info('Collecting hardware information');
        
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
    } catch (error) {
        logger.error(`Error in getHardwareInfo: ${error}`);
        throw error;
    }
}