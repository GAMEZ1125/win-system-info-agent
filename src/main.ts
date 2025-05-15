import { getSystemInfo } from './services/system-info';
import { getHardwareInfo } from './services/hardware-info';
import { saveSystemInfo } from './services/database';
import { logger } from './utils/logger';

async function main() {
    try {
        const systemInfo = await getSystemInfo();
        const hardwareInfo = await getHardwareInfo();
        
        const deviceInfo = {
            ...systemInfo,
            ...hardwareInfo
        };

        await saveSystemInfo(deviceInfo);
        logger.info('Device information saved successfully.');
    } catch (error) {
        logger.error('An error occurred while collecting or saving device information:', error);
    }
}

main();