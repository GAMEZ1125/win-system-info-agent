import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execPromise = promisify(exec);

// Configuración de instalación
const APP_NAME = 'SystemInfoAgent';
const SERVICE_NAME = 'SystemInfoAgentService';
const INSTALL_DIR = path.join(process.env.PROGRAMFILES || 'C:\\Program Files', APP_NAME);
const STARTUP_REG_KEY = 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run';

async function install(): Promise<void> {
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
  } catch (error) {
    console.error(`Error durante la instalación: ${error}`);
  }
}

function copyFiles(source: string, destination: string): void {
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
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

async function registerStartup(): Promise<void> {
  try {
    const exePath = path.join(INSTALL_DIR, 'SystemInfoAgent.exe');
    
    // Usar registro para iniciar automáticamente (más discreto que un servicio)
    await execPromise(`reg add ${STARTUP_REG_KEY} /v "${APP_NAME}" /t REG_SZ /d "${exePath}" /f`);
    
    console.log('Aplicación registrada para inicio automático');
  } catch (error) {
    console.error(`Error al registrar para inicio automático: ${error}`);
    throw error;
  }
}

// Ejecutar el instalador
install().catch(error => {
  console.error(`Error fatal en el instalador: ${error}`);
  process.exit(1);
});