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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const os = __importStar(require("os"));
const execPromise = (0, util_1.promisify)(child_process_1.exec);
// Configuración de instalación
const APP_NAME = 'SystemInfoAgent';
const SERVICE_NAME = 'SystemInfoAgentService';
const INSTALL_DIR = path.join(process.env.PROGRAMFILES || 'C:\\Program Files', APP_NAME);
const STARTUP_REG_KEY = 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run';
async function install() {
    try {
        console.log('Comenzando la instalación...');
        // Crear directorio de instalación
        if (!fs.existsSync(INSTALL_DIR)) {
            fs.mkdirSync(INSTALL_DIR, { recursive: true });
        }
        // Crear directorio para logs
        const logDir = path.join(os.homedir(), 'AppData', 'Local', APP_NAME, 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        // Copiar archivos
        const sourceDir = path.join(__dirname, '..');
        copyFiles(sourceDir, INSTALL_DIR);
        // Registrar para inicio automático
        await registerStartup();
        console.log('Instalación completada exitosamente');
    }
    catch (error) {
        console.error(`Error durante la instalación: ${error}`);
    }
}
function copyFiles(source, destination) {
    const files = fs.readdirSync(source);
    for (const file of files) {
        const sourcePath = path.join(source, file);
        const destPath = path.join(destination, file);
        const stat = fs.statSync(sourcePath);
        if (stat.isDirectory()) {
            if (!fs.existsSync(destPath)) {
                fs.mkdirSync(destPath, { recursive: true });
            }
            copyFiles(sourcePath, destPath);
        }
        else {
            fs.copyFileSync(sourcePath, destPath);
        }
    }
}
async function registerStartup() {
    try {
        const exePath = path.join(INSTALL_DIR, 'SystemInfoAgent.exe');
        // Usar registro para iniciar automáticamente (más discreto que un servicio)
        await execPromise(`reg add ${STARTUP_REG_KEY} /v "${APP_NAME}" /t REG_SZ /d "${exePath}" /f`);
        console.log('Aplicación registrada para inicio automático');
    }
    catch (error) {
        console.error(`Error al registrar para inicio automático: ${error}`);
        throw error;
    }
}
// Ejecutar el instalador
install().catch(error => {
    console.error(`Error fatal en el instalador: ${error}`);
    process.exit(1);
});
