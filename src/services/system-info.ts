import * as os from 'os';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { logger } from '../utils/logger';

export async function getSystemInfo() {
    try {
        logger.info('Collecting system information');
        
        const computerName = os.hostname();
        let manufacturer = 'Unknown';
        let model = 'Unknown';
        let serialNumber = 'Unknown';
        let osProductKey = 'Unknown';
        let osServicePack = 'Unknown';
        let lastLogonUser = os.userInfo().username;
        let deviceType = 'Unknown';

        try {
            // Obtener información del fabricante
            manufacturer = execSync('wmic computersystem get manufacturer')
                .toString()
                .split('\n')[1]
                .trim();
                
            // Obtener modelo del dispositivo
            model = execSync('wmic computersystem get model')
                .toString()
                .split('\n')[1]
                .trim();
                
            // Obtener número de serie
            serialNumber = execSync('wmic bios get serialnumber')
                .toString()
                .split('\n')[1]
                .trim();
                
            // Intentar obtener clave de producto de Windows (puede requerir elevación)
            try {
                osProductKey = execSync('wmic path softwarelicensingservice get OA3xOriginalProductKey')
                    .toString()
                    .split('\n')[1]
                    .trim();
            } catch (error) {
                logger.warn('Could not retrieve OS product key (may require administrator privileges)');
            }
            
            // Obtener service pack
            const osInfoOutput = execSync('wmic os get ServicePackMajorVersion')
                .toString()
                .split('\n')[1]
                .trim();
            osServicePack = osInfoOutput !== '' ? `SP${osInfoOutput}` : 'None';
            
            // Determinar tipo de dispositivo
            const chassisType = execSync('wmic systemenclosure get chassistypes')
                .toString()
                .split('\n')[1]
                .trim();
            
            // Convertir el tipo de chasis a un nombre más amigable
            const chassisTypeNumber = parseInt(chassisType);
            if ([8, 9, 10, 11, 12, 14, 18, 21, 30, 31, 32].includes(chassisTypeNumber)) {
                deviceType = 'Laptop';
            } else if ([3, 4, 5, 6, 7, 15, 16].includes(chassisTypeNumber)) {
                deviceType = 'Desktop';
            } else if ([17, 23].includes(chassisTypeNumber)) {
                deviceType = 'Server';
            } else {
                deviceType = 'Unknown';
            }
        } catch (error) {
            logger.error(`Error collecting WMI information: ${error}`);
        }

        // Información de sistema operativo
        const osInfo = {
            platform: os.platform(),
            release: os.release(),
            version: os.version(),
            arch: os.arch(),
            type: os.type()
        };

        // Información de almacenamiento (para el disco C:)
        let diskInfo = {
            size: '0 GB',
            freeSpace: '0 GB',
            usedSpace: '0 GB'
        };

        try {
            const driveData = execSync('wmic logicaldisk where DeviceID="C:" get Size,FreeSpace')
                .toString()
                .trim()
                .split('\n')[1]
                .trim()
                .split(/\s+/);
            
            if (driveData.length >= 2) {
                const size = parseFloat(driveData[1]);
                const freeSpace = parseFloat(driveData[0]);
                
                if (!isNaN(size) && !isNaN(freeSpace)) {
                    const usedSpace = size - freeSpace;
                    
                    diskInfo = {
                        size: `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`,
                        freeSpace: `${(freeSpace / (1024 * 1024 * 1024)).toFixed(2)} GB`,
                        usedSpace: `${(usedSpace / (1024 * 1024 * 1024)).toFixed(2)} GB`
                    };
                }
            }
        } catch (error) {
            logger.error(`Error collecting disk information: ${error}`);
        }

        // Último inicio de sesión
        const lastBootTime = new Date(Date.now() - os.uptime() * 1000);

        return {
            computerName,
            manufacturer,
            model,
            serialNumber,
            processor: `${os.cpus()[0].model}`,
            ramTotal: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`,
            storageTotal: diskInfo.size,
            storageFree: diskInfo.freeSpace,
            storageUsed: diskInfo.usedSpace,
            operatingSystem: `${osInfo.type} ${osInfo.release}`,
            osServicePack,
            osProductKey,
            deviceType,
            lastLogonUser,
            lastBootTime,
            clientId: Buffer.from(`${computerName}-${serialNumber}`).toString('base64'),
            ipAddress: getIpAddress(),
            macAddress: getMacAddress()
        };
    } catch (error) {
        logger.error(`Error in getSystemInfo: ${error}`);
        throw error;
    }
}

function getIpAddress(): string {
    try {
        const interfaces = os.networkInterfaces();
        // Buscar la primera interfaz no interna con IPv4
        for (const name in interfaces) {
            const iface = interfaces[name];
            if (iface) {
                for (const entry of iface) {
                    if (entry.family === 'IPv4' && !entry.internal) {
                        return entry.address;
                    }
                }
            }
        }
        return 'Unknown';
    } catch (error) {
        logger.error(`Error getting IP address: ${error}`);
        return 'Unknown';
    }
}

function getMacAddress(): string {
    try {
        const interfaces = os.networkInterfaces();
        // Buscar la primera interfaz no interna
        for (const name in interfaces) {
            const iface = interfaces[name];
            if (iface) {
                for (const entry of iface) {
                    if (entry.family === 'IPv4' && !entry.internal) {
                        return entry.mac;
                    }
                }
            }
        }
        return 'Unknown';
    } catch (error) {
        logger.error(`Error getting MAC address: ${error}`);
        return 'Unknown';
    }
}