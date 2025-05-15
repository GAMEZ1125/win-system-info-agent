"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const system_info_1 = require("./services/system-info");
const hardware_info_1 = require("./services/hardware-info");
const database_1 = require("./services/database");
const logger_1 = require("./utils/logger");
async function main() {
    try {
        const systemInfo = await (0, system_info_1.getSystemInfo)();
        const hardwareInfo = await (0, hardware_info_1.getHardwareInfo)();
        const deviceInfo = {
            ...systemInfo,
            ...hardwareInfo
        };
        await (0, database_1.saveSystemInfo)(deviceInfo);
        logger_1.logger.info('Device information saved successfully.');
    }
    catch (error) {
        logger_1.logger.error('An error occurred while collecting or saving device information:', error);
    }
}
main();
