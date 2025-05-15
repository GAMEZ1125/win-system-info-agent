"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWarning = exports.handleError = void 0;
const logger_1 = require("./logger");
function handleError(error, context = 'unknown') {
    logger_1.logger.error(`Error in ${context}: ${error.message}`);
    if (error.stack) {
        logger_1.logger.error(`Stack trace: ${error.stack}`);
    }
}
exports.handleError = handleError;
function handleWarning(message, context = 'unknown') {
    logger_1.logger.warn(`Warning in ${context}: ${message}`);
}
exports.handleWarning = handleWarning;
