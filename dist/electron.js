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
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const logger_1 = require("./utils/logger");
const app_1 = require("./app"); // Importar la aplicación principal
// Instancia de la aplicación principal (solo se crea cuando se ejecuta la recopilación desde la UI)
let systemInfoApp = null;
// Eliminar la importación de electron-is-dev y usar app.isPackaged en su lugar
const isDev = !electron_1.app.isPackaged;
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Mantén una referencia global al objeto Tray, si no lo haces,
// el ícono desaparecerá cuando el garbage collector se ejecute
let tray = null;
let mainWindow = null;
// Variables para el servicio
const serviceName = 'SystemInfoAgent';
let serviceStatus = 'unknown';
// Inicializar la propiedad isQuitting
electron_1.app.isQuitting = false;
// Asegurar que solo se ejecute una instancia de la aplicación
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        // Alguien intentó ejecutar una segunda instancia, enfocamos nuestra ventana
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
    // Crea la ventana principal y la bandeja cuando Electron esté listo
    electron_1.app.whenReady().then(() => {
        // Registrar el manejador IPC una sola vez al inicio
        setupCollectInfoHandler();
        // Continuar con la inicialización normal
        setupIPC(); // Ahora esta función no registra collect-system-info
        createTray();
        checkServiceStatus();
        electron_1.app.on('activate', function () {
            // En macOS es común re-crear una ventana en la aplicación cuando
            // el ícono del dock es clickeado y no hay otras ventanas abiertas.
            if (electron_1.BrowserWindow.getAllWindows().length === 0)
                createWindow();
        });
    });
    // Salir cuando todas las ventanas estén cerradas, excepto en macOS
    electron_1.app.on('window-all-closed', function () {
        if (process.platform !== 'darwin') {
            // No queremos salir cuando se cierre una ventana
            // solo las ocultamos para que la aplicación siga corriendo en bandeja
        }
    });
    // Este método evitará que la aplicación se cierre cuando se presione X
    electron_1.app.on('before-quit', async (event) => {
        // Si el usuario está intentando cerrar la app completamente, mostrar un diálogo
        if (!electron_1.app.isQuitting) {
            event.preventDefault();
            const result = await electron_1.dialog.showMessageBox({
                type: 'question',
                buttons: ['Minimizar a la bandeja', 'Cerrar'],
                title: 'Confirmación',
                message: '¿Estás seguro de que quieres cerrar la aplicación?',
                detail: 'La aplicación seguirá ejecutándose en segundo plano. Si deseas cerrarla completamente, hazlo desde el menú de la bandeja del sistema.'
            });
            if (result.response === 1) {
                electron_1.app.isQuitting = true;
                // Si hay una instancia de la aplicación principal, cerrarla correctamente
                if (systemInfoApp) {
                    await systemInfoApp.shutdown();
                    systemInfoApp = null;
                }
                electron_1.app.quit();
            }
        }
    });
}
// Función para recopilar información desde la UI
async function collectSystemInfo() {
    try {
        if (!systemInfoApp) {
            systemInfoApp = new app_1.App({
                notifyEnabled: true,
                notifyCallback: showToastNotification
            });
            await systemInfoApp.initialize();
        }
        else {
            // Solo ejecutar la recopilación
            await systemInfoApp.collectAndSaveSystemInfo();
        }
        return { success: true, message: 'Información recopilada correctamente' };
    }
    catch (error) {
        logger_1.logger.error(`Error al recopilar información: ${error}`);
        return { success: false, message: String(error) };
    }
}
// Configurar IPC para comunicación entre proceso principal y renderer
function setupIPC() {
    // Este espacio queda disponible para otros manejadores globales que no sean específicos de ventanas
    logger_1.logger.info('Configuración IPC general inicializada');
}
function getIconPath() {
    try {
        // Buscar el icono en varias posibles ubicaciones
        const iconNames = ['icon.ico', 'app.ico', 'tray.ico', 'icon.png', 'app.png'];
        const possiblePaths = [];
        // Generar todas las rutas posibles para cada nombre de archivo
        for (const iconName of iconNames) {
            possiblePaths.push(
            // Ruta de desarrollo
            path.join(__dirname, '..', 'resources', iconName), 
            // Ruta en producción (app.asar)
            path.join(process.resourcesPath || '', iconName), 
            // Ruta alternativa en producción - directamente en resources
            path.join(electron_1.app.getAppPath(), 'resources', iconName), 
            // Ruta para resources en directorio de instalación
            path.join(path.dirname(process.execPath), 'resources', iconName), 
            // Ruta absoluta para depuración
            path.join(process.cwd(), 'resources', iconName), 
            // Directamente en la carpeta de la aplicación
            path.join(electron_1.app.getAppPath(), iconName), 
            // En extraResources
            path.join(electron_1.app.getAppPath(), '..', 'resources', iconName));
        }
        // Registrar todas las rutas que estamos verificando
        logger_1.logger.info(`Buscando ícono en ${possiblePaths.length} ubicaciones posibles`);
        // Buscar en todas las rutas posibles
        for (const iconPath of possiblePaths) {
            if (fs.existsSync(iconPath)) {
                logger_1.logger.info(`Ícono encontrado en: ${iconPath}`);
                return iconPath;
            }
        }
        // Si no se encuentra, registrar todas las rutas que intentamos
        logger_1.logger.warn(`No se encontró el ícono en ninguna ubicación. Rutas probadas: ${possiblePaths.join(', ')}`);
        return null;
    }
    catch (error) {
        logger_1.logger.error(`Error al buscar el ícono: ${error}`);
        return null;
    }
}
async function checkServiceStatus() {
    try {
        const { stdout } = await execAsync(`sc query "${serviceName}"`);
        if (stdout.includes('RUNNING')) {
            serviceStatus = 'running';
        }
        else if (stdout.includes('STOPPED')) {
            serviceStatus = 'stopped';
        }
        else {
            serviceStatus = 'unknown';
        }
        // Actualizar el menú del tray para reflejar el estado actual
        updateTrayMenu();
        logger_1.logger.info(`Estado del servicio: ${serviceStatus}`);
    }
    catch (error) {
        // Si hay un error, probablemente el servicio no está instalado
        serviceStatus = 'unknown';
        updateTrayMenu();
        logger_1.logger.error(`Error al verificar estado del servicio: ${error}`);
    }
}
async function startService() {
    try {
        await execAsync(`net start "${serviceName}"`);
        logger_1.logger.info('Servicio iniciado correctamente');
        serviceStatus = 'running';
        updateTrayMenu();
    }
    catch (error) {
        logger_1.logger.error(`Error al iniciar servicio: ${error}`);
        electron_1.dialog.showErrorBox('Error', `No se pudo iniciar el servicio: ${error}`);
    }
}
async function stopService() {
    try {
        await execAsync(`net stop "${serviceName}"`);
        logger_1.logger.info('Servicio detenido correctamente');
        serviceStatus = 'stopped';
        updateTrayMenu();
    }
    catch (error) {
        logger_1.logger.error(`Error al detener servicio: ${error}`);
        electron_1.dialog.showErrorBox('Error', `No se pudo detener el servicio: ${error}`);
    }
}
function createTray() {
    // Registrar información de directorios para diagnóstico
    logger_1.logger.info(`Directorio actual: ${process.cwd()}`);
    logger_1.logger.info(`Directorio de la aplicación: ${electron_1.app.getAppPath()}`);
    logger_1.logger.info(`Directorio de recursos: ${process.resourcesPath || 'no disponible'}`);
    logger_1.logger.info(`Ruta del ejecutable: ${process.execPath}`);
    const iconPath = getIconPath();
    logger_1.logger.info(`Ruta del ícono obtenida: ${iconPath || 'No se encontró'}`);
    let icon;
    if (iconPath) {
        try {
            // Crear imagen nativa a partir del archivo
            icon = electron_1.nativeImage.createFromPath(iconPath);
            // Verificar si la imagen está vacía
            if (icon.isEmpty()) {
                logger_1.logger.error(`El ícono en ${iconPath} está vacío o no se pudo cargar correctamente`);
                // Crear un icono genérico si el encontrado está vacío
                const genericIconBuffer = Buffer.alloc(16 * 16 * 4);
                for (let i = 0; i < genericIconBuffer.length; i += 4) {
                    // RGBA: azul/verde
                    genericIconBuffer[i] = 0; // R
                    genericIconBuffer[i + 1] = 120; // G
                    genericIconBuffer[i + 2] = 200; // B
                    genericIconBuffer[i + 3] = 200; // A
                }
                icon = electron_1.nativeImage.createFromBuffer(genericIconBuffer, {
                    width: 16,
                    height: 16
                });
                logger_1.logger.info('Creado icono genérico como fallback');
            }
            else {
                // El icono se cargó correctamente, redimensionarlo específicamente para la bandeja
                const sizes = icon.getSize();
                logger_1.logger.info(`Tamaño original del icono: ${sizes.width}x${sizes.height}`);
                // Redimensionar a 16x16 para la bandeja del sistema en Windows
                const resizedIcon = icon.resize({ width: 16, height: 16 });
                if (!resizedIcon.isEmpty()) {
                    icon = resizedIcon;
                    logger_1.logger.info('Ícono redimensionado correctamente a 16x16');
                }
                else {
                    logger_1.logger.warn('No se pudo redimensionar el icono, usando original');
                }
            }
        }
        catch (error) {
            logger_1.logger.error(`Error al procesar el ícono: ${error}`);
            // Crear un icono genérico en caso de error
            const genericIconBuffer = Buffer.alloc(16 * 16 * 4);
            for (let i = 0; i < genericIconBuffer.length; i += 4) {
                // RGBA: rojo (para indicar error)
                genericIconBuffer[i] = 200; // R
                genericIconBuffer[i + 1] = 0; // G
                genericIconBuffer[i + 2] = 0; // B
                genericIconBuffer[i + 3] = 200; // A
            }
            icon = electron_1.nativeImage.createFromBuffer(genericIconBuffer, {
                width: 16,
                height: 16
            });
        }
    }
    else {
        logger_1.logger.error('No se encontró el archivo de ícono en ninguna ubicación conocida');
        // Crear un icono genérico cuando no se encuentra el archivo
        const genericIconBuffer = Buffer.alloc(16 * 16 * 4);
        for (let i = 0; i < genericIconBuffer.length; i += 4) {
            // RGBA: gris
            genericIconBuffer[i] = 150; // R
            genericIconBuffer[i + 1] = 150; // G
            genericIconBuffer[i + 2] = 150; // B
            genericIconBuffer[i + 3] = 200; // A
        }
        icon = electron_1.nativeImage.createFromBuffer(genericIconBuffer, {
            width: 16,
            height: 16
        });
        logger_1.logger.info('Creado icono genérico porque no se encontró un archivo');
    }
    // Crear el tray con el icono preparado
    tray = new electron_1.Tray(icon);
    tray.setToolTip('System Info Agent');
    updateTrayMenu();
    // Cuando se haga doble clic en el ícono del tray, mostrar la ventana de estado
    tray.on('double-click', createWindow);
    logger_1.logger.info('Tray creado correctamente');
}
function updateTrayMenu() {
    if (!tray)
        return;
    const statusText = serviceStatus === 'running'
        ? 'Servicio: En ejecución'
        : serviceStatus === 'stopped'
            ? 'Servicio: Detenido'
            : 'Servicio: Estado desconocido';
    const menu = electron_1.Menu.buildFromTemplate([
        { label: statusText, enabled: false },
        { type: 'separator' },
        {
            label: 'Ver Estado',
            click: createWindow
        },
        {
            label: serviceStatus === 'running' ? 'Detener Servicio' : 'Iniciar Servicio',
            click: () => {
                if (serviceStatus === 'running') {
                    stopService();
                }
                else {
                    startService();
                }
            },
            enabled: serviceStatus !== 'unknown'
        },
        {
            label: 'Ejecutar Recopilación Ahora',
            click: async () => {
                try {
                    if (serviceStatus === 'running') {
                        // Si el servicio está corriendo, envía un comando para ejecutar la recopilación
                        await execAsync(`"${process.execPath}" --service --collect-now`);
                        showToastNotification('Recopilación de Información', 'Se ha enviado la solicitud de recopilación al servicio.');
                    }
                    else {
                        // Si el servicio no está corriendo, ejecuta la recopilación directamente usando la función común
                        const result = await collectSystemInfo();
                        if (result.success) {
                            showToastNotification('Recopilación de Información', 'Información recopilada correctamente');
                        }
                        else {
                            showToastNotification('Error', `Error al recopilar información: ${result.message}`);
                        }
                    }
                }
                catch (error) {
                    logger_1.logger.error(`Error al ejecutar recopilación: ${error}`);
                    showToastNotification('Error', `No se pudo ejecutar la recopilación: ${error}`);
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Instalar Servicio',
            click: async () => {
                try {
                    await execAsync(`"${process.execPath}" --install-service`);
                    electron_1.dialog.showMessageBox({
                        type: 'info',
                        title: 'Instalación de Servicio',
                        message: 'El servicio se ha instalado correctamente.'
                    });
                    checkServiceStatus();
                }
                catch (error) {
                    logger_1.logger.error(`Error al instalar servicio: ${error}`);
                    electron_1.dialog.showErrorBox('Error', `No se pudo instalar el servicio: ${error}`);
                }
            },
            enabled: serviceStatus === 'unknown'
        },
        {
            label: 'Desinstalar Servicio',
            click: async () => {
                try {
                    await execAsync(`"${process.execPath}" --uninstall-service`);
                    electron_1.dialog.showMessageBox({
                        type: 'info',
                        title: 'Desinstalación de Servicio',
                        message: 'El servicio se ha desinstalado correctamente.'
                    });
                    serviceStatus = 'unknown';
                    updateTrayMenu();
                }
                catch (error) {
                    logger_1.logger.error(`Error al desinstalar servicio: ${error}`);
                    electron_1.dialog.showErrorBox('Error', `No se pudo desinstalar el servicio: ${error}`);
                }
            },
            enabled: serviceStatus !== 'unknown'
        },
        { type: 'separator' },
        {
            label: 'Salir',
            click: () => {
                electron_1.app.isQuitting = true;
                electron_1.app.quit();
            }
        }
    ]);
    tray.setContextMenu(menu);
}
// Modificar la función createWindow()
function createWindow() {
    // Evitar crear múltiples ventanas
    if (mainWindow) {
        mainWindow.show();
        return;
    }
    // Definir constante para intervalo de actualización
    const intervalHours = 6;
    // Obtener la ruta del icono
    const iconPath = getIconPath();
    const iconOption = iconPath || undefined;
    mainWindow = new electron_1.BrowserWindow({
        width: 900,
        height: 680,
        resizable: true,
        icon: iconOption,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            devTools: true,
            webSecurity: false // Permite carga de recursos locales
        },
        backgroundColor: '#202020',
        show: false,
        autoHideMenuBar: true,
        titleBarStyle: 'hidden',
        frame: false,
    });
    // En lugar de cargar HTML desde data:uri, crear y cargar un archivo HTML temporal
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    // Crear directorio temporal si no existe
    const tempDir = path.join(os.tmpdir(), 'systeminfo-agent');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    // Crear archivo HTML temporal
    const htmlPath = path.join(tempDir, 'dashboard.html');
    // Contenido HTML (usar el mismo HTML que tenías antes)
    const htmlContent = `<!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SystemInfoAgent Dashboard</title>
    <style>
      /* Aquí todo tu CSS existente */
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 var(--accent-alpha); }
        70% { box-shadow: 0 0 0 10px rgba(0, 0, 0, 0); }
        100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      :root {
        --background: #202020;
        --card-bg: #2d2d2d;
        --text: #e0e0e0;
        --text-secondary: #a0a0a0;
        --accent: #0078D4;
        --accent-hover: #1a86d9;
        --accent-active: #0069c0;
        --accent-alpha: rgba(0, 120, 212, 0.7);
        --danger: #e74c3c;
        --danger-hover: #c0392b;
        --success: #2ecc71;
        --success-light-bg: rgba(46, 204, 113, 0.2);
        --error: #e74c3c;
        --error-light-bg: rgba(231, 76, 60, 0.2);
        --warning: #f39c12;
        --warning-light-bg: rgba(241, 196, 15, 0.2);
        --border: rgba(255, 255, 255, 0.1);
        --card-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        --card-shadow-hover: 0 8px 16px rgba(0, 0, 0, 0.3);
        --titlebar-bg: #1a1a1a;
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: 'Segoe UI', sans-serif;
        user-select: none;
      }
      
      body {
        margin: 0;
        padding: 0;
        background-color: var(--background);
        color: var(--text);
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 8px;
        height: 100vh;
      }
      
      #app-container {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      
      .title-bar {
        height: 32px;
        background-color: var(--titlebar-bg);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px;
        -webkit-app-region: drag;
        border-bottom: 1px solid var(--border);
      }
      
      .app-title {
        color: var(--text);
        font-size: 12px;
        opacity: 0.7;
      }
      
      .title-bar-buttons {
        display: flex;
        -webkit-app-region: no-drag;
      }
      
      .title-button {
        width: 46px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
        font-family: 'Segoe MDL2 Assets', 'Segoe UI Symbol';
        color: var(--text);
        cursor: pointer;
      }
      
      .title-button:hover {
        background-color: rgba(127, 127, 127, 0.2);
      }
      
      #close-button:hover {
        background-color: var(--danger);
        color: white;
      }
      
      .app-body {
        display: flex;
        flex: 1;
        overflow: hidden;
      }
      
      .sidebar {
        width: 220px;
        background-color: rgba(45, 45, 45, 0.7);
        backdrop-filter: blur(10px);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        padding-top: 15px;
      }
      
      .nav-logo {
        padding: 10px 20px 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        border-bottom: 1px solid var(--border);
      }
      
      .nav-logo img {
        width: 32px;
        height: 32px;
      }
      
      .nav-logo-text {
        font-size: 16px;
        font-weight: 600;
        color: var(--text);
      }
      
      .nav-menu {
        list-style: none;
        padding: 0;
        margin: 0;
        flex: 1;
      }
      
      .nav-item {
        padding: 10px 15px;
        margin: 5px 10px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.2s ease;
      }
      
      .nav-item:hover {
        background-color: rgba(255, 255, 255, 0.08);
      }
      
      .nav-item.active {
        background-color: rgba(0, 120, 212, 0.2);
        color: var(--accent);
      }
      
      .nav-item-icon {
        font-family: 'Segoe MDL2 Assets', 'Segoe UI Symbol';
        font-size: 16px;
      }
      
      .nav-footer {
        padding: 15px;
        border-top: 1px solid var(--border);
        font-size: 11px;
        color: var(--text-secondary);
        text-align: center;
      }
      
      .nav-footer a {
        color: var(--accent);
        text-decoration: none;
      }
      
      .content {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        position: relative;
      }
      
      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .card {
        background-color: var(--card-bg);
        border-radius: 8px;
        box-shadow: var(--card-shadow);
        padding: 20px;
        transition: all 0.3s ease;
        animation: fadeIn 0.5s ease forwards;
        animation-delay: calc(var(--delay) * 0.1s);
        opacity: 0;
      }
      
      .card:hover {
        box-shadow: var(--card-shadow-hover);
        transform: translateY(-2px);
      }
      
      .card-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 15px;
        color: var(--accent);
        display: flex;
        align-items: center;
      }
      
      .card-title-icon {
        margin-right: 8px;
        font-family: 'Segoe MDL2 Assets', 'Segoe UI Symbol';
        font-size: 18px;
      }
      
      .status-value {
        padding: 10px;
        border-radius: 6px;
        margin-bottom: 15px;
        font-weight: 500;
        display: flex;
        align-items: center;
        transition: all 0.3s ease;
      }
      
      .status-icon {
        margin-right: 10px;
        font-size: 16px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .running {
        background-color: var(--success-light-bg);
        color: var(--success);
      }
      
      .stopped {
        background-color: var(--error-light-bg);
        color: var(--error);
      }
      
      .unknown {
        background-color: var(--warning-light-bg);
        color: var(--warning);
      }
      
      .button {
        background-color: var(--accent);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        outline: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      
      .button:hover {
        background-color: var(--accent-hover);
      }
      
      .button:active {
        background-color: var(--accent-active);
        transform: scale(0.98);
      }
      
      .button:disabled {
        background-color: rgba(127, 127, 127, 0.3);
        color: rgba(127, 127, 127, 0.7);
        cursor: not-allowed;
      }
      
      .button.secondary {
        background-color: transparent;
        color: var(--accent);
        border: 1px solid var(--accent);
      }
      
      .button.secondary:hover {
        background-color: rgba(0, 120, 212, 0.05);
      }
      
      .button.danger {
        background-color: var(--danger);
      }
      
      .button.danger:hover {
        background-color: var(--danger-hover);
      }
      
      .button-row {
        display: flex;
        gap: 10px;
        margin-top: 10px;
        flex-wrap: wrap;
      }
      
      .countdown-container {
        text-align: center;
        margin-bottom: 20px;
      }
      
      .countdown-title {
        font-size: 16px;
        color: var(--text);
        margin-bottom: 15px;
      }
      
      .countdown {
        display: flex;
        justify-content: center;
        gap: 15px;
      }
      
      .countdown-item {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      .countdown-value {
        font-size: 28px;
        font-weight: 700;
        color: var(--accent);
        background-color: rgba(0, 120, 212, 0.1);
        border-radius: 8px;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 5px;
        position: relative;
        overflow: hidden;
      }
      
      .countdown-label {
        font-size: 12px;
        color: var(--text-secondary);
      }
      
      .info-item {
        display: flex;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid var(--border);
      }
      
      .info-label {
        flex: 1;
        color: var(--text-secondary);
      }
      
      .info-value {
        font-weight: 500;
      }
      
      .section-title {
        font-size: 18px;
        margin: 30px 0 15px;
        color: var(--text);
        position: relative;
        padding-bottom: 8px;
      }
      
      .section-title::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 40px;
        height: 3px;
        background-color: var(--accent);
        border-radius: 3px;
      }
      
      .tab-content {
        display: none;
      }
      
      .tab-content.active {
        display: block;
        animation: fadeIn 0.3s ease forwards;
      }
      
      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s linear infinite;
        margin-right: 8px;
      }
      
      .collect-btn {
        width: 100%;
        margin-top: 20px;
        animation: pulse 2s infinite;
      }
      
      .developer-card {
        background-color: #242932;
        border-radius: 10px;
        display: flex;
        padding: 5px;
        align-items: center;
        margin-top: 20px;
        border: 1px solid #353e4c;
      }
      
      .dev-logo {
        width: 80px;
        height: 80px;
        border-radius: 8px;
        overflow: hidden;
        margin-right: 15px;
      }
      
      .dev-logo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .dev-info {
        flex: 1;
      }
      
      .dev-name {
        font-weight: 600;
        font-size: 16px;
        margin-bottom: 5px;
        color: var(--text);
      }
      
      .dev-description {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 10px;
      }
      
      .dev-link {
        display: inline-block;
        color: var(--accent);
        font-size: 14px;
        text-decoration: none;
      }
      
      .toast-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
      }
      
      .toast {
        background-color: rgba(45, 45, 45, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        animation: toast-in 0.3s ease forwards;
        max-width: 300px;
        backdrop-filter: blur(10px);
      }
      
      @keyframes toast-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      .toast-title {
        font-weight: 600;
        margin-bottom: 5px;
      }
      
      .toast-message {
        font-size: 14px;
        opacity: 0.9;
      }
      
      #loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(5px);
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }
      
      #loading-overlay.visible {
        opacity: 1;
        pointer-events: auto;
      }
      
      .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        border-top: 4px solid var(--accent);
        animation: spin 1s linear infinite;
      }
      
      .system-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      
      .stat-card {
        background-color: rgba(45, 45, 45, 0.8);
        border-radius: 8px;
        padding: 15px;
        display: flex;
        flex-direction: column;
        transition: all 0.2s ease;
      }
      
      .stat-card:hover {
        background-color: rgba(55, 55, 55, 0.8);
        transform: translateY(-3px);
      }
      
      .stat-label {
        font-size: 14px;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }
      
      .stat-value {
        font-size: 20px;
        font-weight: 600;
        color: var(--text);
      }
      
      .stat-icon {
        align-self: flex-end;
        font-family: 'Segoe MDL2 Assets', 'Segoe UI Symbol';
        font-size: 24px;
        color: var(--accent);
        margin-top: -30px;
        opacity: 0.5;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .dashboard-grid {
          grid-template-columns: 1fr;
        }
        
        .countdown-value {
          width: 50px;
          height: 50px;
          font-size: 24px;
        }
      }
    </style>
  </head>
  <body>
    <div id="app-container">
      <!-- Barra de título personalizada -->
      <div class="title-bar">
        <div class="app-title">SystemInfoAgent Dashboard</div>
        <div class="title-bar-buttons">
          <div id="minimize-button" class="title-button">&#xE921;</div>
          <div id="close-button" class="title-button">&#xE8BB;</div>
        </div>
      </div>
      
      <div class="app-body">
        <!-- Sidebar -->
        <div class="sidebar">
          <div class="nav-logo">
            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMkM5Ljk1IDIgMiA5Ljk1IDIgMjBDMiAzMC4wNSA5Ljk1IDM4IDIwIDM4QzMwLjA1IDM4IDM4IDMwLjA1IDM4IDIwQzM4IDkuOTUgMzAuMDUgMiAyMCAyWk0yNiAyMkgyMlYyNkgyMFYyMkgxNlYyMEgyMFYxNkgyMlYyMEgyNlYyMloiIGZpbGw9IiMwMDc4RDQiLz48L3N2Zz4=" alt="Logo">
            <div class="nav-logo-text">SystemInfoAgent</div>
          </div>
          
          <ul class="nav-menu">
            <li class="nav-item active" data-tab="dashboard">
              <span class="nav-item-icon">&#xE80F;</span>
              <span>Dashboard</span>
            </li>
            <li class="nav-item" data-tab="status">
              <span class="nav-item-icon">&#xE7BA;</span>
              <span>Estado del Servicio</span>
            </li>
            <li class="nav-item" data-tab="config">
              <span class="nav-item-icon">&#xE713;</span>
              <span>Configuración</span>
            </li>
            <li class="nav-item" data-tab="about">
              <span class="nav-item-icon">&#xE946;</span>
              <span>Acerca de</span>
            </li>
          </ul>
          
          <div class="nav-footer">
            <div>SystemInfoAgent v1.0.0</div>
            <div style="margin-top: 5px;">
              <a href="https://gamezsolutions.netlify.app/" target="_blank">Gamez Code Solutions</a>
            </div>
          </div>
        </div>
        
        <!-- Contenido principal -->
        <div class="content">
          <!-- Dashboard Tab -->
          <div id="dashboard-tab" class="tab-content active">
            <!-- Información del sistema -->
            <div class="countdown-container">
              <div class="countdown-title">Próxima actualización en:</div>
              <div class="countdown">
                <div class="countdown-item">
                  <div class="countdown-value" id="hours">00</div>
                  <div class="countdown-label">Horas</div>
                </div>
                <div class="countdown-item">
                  <div class="countdown-value" id="minutes">00</div>
                  <div class="countdown-label">Minutos</div>
                </div>
                <div class="countdown-item">
                  <div class="countdown-value" id="seconds">00</div>
                  <div class="countdown-label">Segundos</div>
                </div>
              </div>
            </div>
            
            <button id="collectBtn" class="button collect-btn">
              <span class="spinner"></span>
              <span>Ejecutar Recopilación Ahora</span>
            </button>
            
            <h2 class="section-title">Información del Sistema</h2>
            
            <div class="system-stats">
              <div class="stat-card">
                <div class="stat-label">Sistema Operativo</div>
                <div class="stat-value" id="os-info">Cargando...</div>
                <div class="stat-icon">&#xE7BA;</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Procesador</div>
                <div class="stat-value" id="cpu-info">Cargando...</div>
                <div class="stat-icon">&#xE950;</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Memoria RAM</div>
                <div class="stat-value" id="ram-info">Cargando...</div>
                <div class="stat-icon">&#xE950;</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">IP / MAC</div>
                <div class="stat-value" id="network-info">Cargando...</div>
                <div class="stat-icon">&#xE839;</div>
              </div>
            </div>
            
            <h2 class="section-title">Estado del Servicio</h2>
            
            <div class="card">
              <div class="card-title">
                <span class="card-title-icon">&#xE7BA;</span>
                SystemInfoAgent
              </div>
              
              <div id="serviceStatus" class="status-value ${serviceStatus === 'running' ? 'running' :
        serviceStatus === 'stopped' ? 'stopped' : 'unknown'}">
                <span class="status-icon">
                  ${serviceStatus === 'running' ? '&#xE930;' :
        serviceStatus === 'stopped' ? '&#xE71A;' : '&#xE9CE;'}
                </span>
                ${serviceStatus === 'running' ? 'En ejecución' :
        serviceStatus === 'stopped' ? 'Detenido' : 'Estado desconocido'}
              </div>
              
              <div class="button-row">
                <button id="startBtn" class="button" ${serviceStatus !== 'stopped' ? 'disabled' : ''}>
                  <span class="spinner"></span>
                  <span>Iniciar Servicio</span>
                </button>
                <button id="stopBtn" class="button danger" ${serviceStatus !== 'running' ? 'disabled' : ''}>
                  <span class="spinner"></span>
                  <span>Detener Servicio</span>
                </button>
                <button id="refreshBtn" class="button secondary" title="Actualizar estado del servicio">
                  <span class="spinner"></span>
                  <span>&#xE72C;</span>
                </button>
              </div>
            </div>
            
            <h2 class="section-title">Desarrollado por</h2>
            
            <div class="developer-card">
              <div class="dev-logo">
                <img src="https://gamezsolutions.netlify.app/assets/logo-02caf29c.png" alt="Gamez Code Solutions">
              </div>
              <div class="dev-info">
                <div class="dev-name">Gamez Code Solutions</div>
                <div class="dev-description">Soluciones de software para empresas y negocios.</div>
                <a href="https://gamezsolutions.netlify.app/" class="dev-link" target="_blank">
                  Visitar sitio web
                </a>
              </div>
            </div>
          </div>
          
          <!-- Tab de Estado del Servicio -->
          <div id="status-tab" class="tab-content">
            <h2 class="section-title">Control del Servicio</h2>
            
            <div class="dashboard-grid">
              <div class="card">
                <div class="card-title">
                  <span class="card-title-icon">&#xE7BA;</span>
                  Estado del Servicio
                </div>
                
                <div id="serviceStatus2" class="status-value ${serviceStatus === 'running' ? 'running' :
        serviceStatus === 'stopped' ? 'stopped' : 'unknown'}">
                  <span class="status-icon">
                    ${serviceStatus === 'running' ? '&#xE930;' :
        serviceStatus === 'stopped' ? '&#xE71A;' : '&#xE9CE;'}
                  </span>
                  ${serviceStatus === 'running' ? 'En ejecución' :
        serviceStatus === 'stopped' ? 'Detenido' : 'Estado desconocido'}
                </div>
                
                <div class="button-row">
                  <button id="startBtn2" class="button" ${serviceStatus !== 'stopped' ? 'disabled' : ''}>
                    <span class="spinner"></span>
                    <span>Iniciar Servicio</span>
                  </button>
                  <button id="stopBtn2" class="button danger" ${serviceStatus !== 'running' ? 'disabled' : ''}>
                    <span class="spinner"></span>
                    <span>Detener Servicio</span>
                  </button>
                  <button id="refreshBtn2" class="button secondary" title="Actualizar estado del servicio">
                    <span class="spinner"></span>
                    <span>&#xE72C;</span>
                  </button>
                </div>
              </div>
              
              <div class="card">
                <div class="card-title">
                  <span class="card-title-icon">&#xE713;</span>
                  Opciones de Servicio
                </div>
                
                <div class="button-row">
                  <button id="installBtn" class="button secondary" ${serviceStatus !== 'unknown' ? 'disabled' : ''}>
                    <span class="spinner"></span>
                    <span>Instalar Servicio</span>
                  </button>
                  <button id="uninstallBtn" class="button secondary" ${serviceStatus === 'unknown' ? 'disabled' : ''}>
                    <span class="spinner"></span>
                    <span>Desinstalar Servicio</span>
                  </button>
                </div>
              </div>
            </div>
            
            <h2 class="section-title">Últimos eventos</h2>
            <div class="card">
              <div id="events-container">
                <div class="info-item">
                  <div class="info-label">Cargando eventos...</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Tab de Configuración -->
          <div id="config-tab" class="tab-content">
            <h2 class="section-title">Configuración</h2>
            
            <div class="card">
              <div class="card-title">
                <span class="card-title-icon">&#xE713;</span>
                Opciones de Sincronización
              </div>
              
              <div class="info-item">
                <div class="info-label">Intervalo de actualización</div>
                <div class="info-value">${intervalHours} horas</div>
              </div>
              
              <div class="info-item">
                <div class="info-label">Servidor remoto</div>
                <div class="info-value" id="server-address">Cargando...</div>
              </div>
              
              <div class="button-row" style="margin-top: 20px;">
                <button id="testConnectionBtn" class="button secondary">
                  Probar Conexión
                </button>
              </div>
            </div>
          </div>
          
          <!-- Tab de Acerca de -->
          <div id="about-tab" class="tab-content">
            <h2 class="section-title">Acerca de SystemInfoAgent</h2>
            
            <div class="card">
              <div class="info-item">
                <div class="info-label">Versión</div>
                <div class="info-value">1.0.0</div>
              </div>
              
              <div class="info-item">
                <div class="info-label">Plataforma</div>
                <div class="info-value">Windows</div>
              </div>
              
              <div class="info-item">
                <div class="info-label">Arquitectura</div>
                <div class="info-value" id="arch-info">Cargando...</div>
              </div>
              
              <div class="info-item">
                <div class="info-label">Directorio de logs</div>
                <div class="info-value" id="log-path">Cargando...</div>
              </div>
            </div>
            
            <h2 class="section-title">Desarrollado por</h2>
            
            <div class="developer-card">
              <div class="dev-logo">
                <img src="https://gamezsolutions.netlify.app/assets/logo-02caf29c.png" alt="Gamez Code Solutions">
              </div>
              <div class="dev-info">
                <div class="dev-name">Gamez Code Solutions</div>
                <div class="dev-description">Desarrollo de software personalizado. Especialistas en soluciones empresariales y herramientas de recolección de datos.</div>
                <a href="https://gamezsolutions.netlify.app/" class="dev-link" target="_blank">
                  Visitar sitio web
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div id="toast-container" class="toast-container"></div>
    <div id="loading-overlay"><div class="loading-spinner"></div></div>
    
    <script>
      // Obtener referencia a los elementos del DOM
      const startBtn = document.getElementById('startBtn');
      const stopBtn = document.getElementById('stopBtn');
      const refreshBtn = document.getElementById('refreshBtn');
      const installBtn = document.getElementById('installBtn');
      const uninstallBtn = document.getElementById('uninstallBtn');
      const collectBtn = document.getElementById('collectBtn');
      const minimizeButton = document.getElementById('minimize-button');
      const closeButton = document.getElementById('close-button');
      const serviceStatusElement = document.getElementById('serviceStatus');
      const serviceStatusElement2 = document.getElementById('serviceStatus2');
      
      // Referencias a elementos adicionales del Status Tab
      const startBtn2 = document.getElementById('startBtn2');
      const stopBtn2 = document.getElementById('stopBtn2');
      const refreshBtn2 = document.getElementById('refreshBtn2');
      
      // Referencias a elementos de información
      const osInfoElement = document.getElementById('os-info');
      const cpuInfoElement = document.getElementById('cpu-info');
      const ramInfoElement = document.getElementById('ram-info');
      const networkInfoElement = document.getElementById('network-info');
      const serverAddressElement = document.getElementById('server-address');
      const archInfoElement = document.getElementById('arch-info');
      const logPathElement = document.getElementById('log-path');
      const eventsContainer = document.getElementById('events-container');
      
      // Acceso a la API de Node.js y Electron
      const { ipcRenderer } = require('electron');
      const { exec } = require('child_process');
      const os = require('os');
      const path = require('path');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      // Variables para el temporizador
      const intervalHours = ${intervalHours}; // Horas del intervalo de recopilación
      let nextUpdateTime = new Date();
      let countdownInterval;
      
      // Función para cambiar entre tabs
      function switchTab(tabId) {
        // Ocultar todos los tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
          tab.classList.remove('active');
        });
        
        // Desactivar todos los items del menú
        document.querySelectorAll('.nav-item').forEach(item => {
          item.classList.remove('active');
        });
        
        // Mostrar el tab seleccionado
        document.getElementById(tabId + '-tab').classList.add('active');
        
        // Activar el item de menú correspondiente
        document.querySelector('.nav-item[data-tab="' + tabId + '"]').classList.add('active');
      }
      
      // Función para mostrar/ocultar el overlay de carga
      function toggleLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
          overlay.classList.add('visible');
        } else {
          overlay.classList.remove('visible');
        }
      }
      
      // Función para actualizar el UI con el estado del servicio
      function updateUI(status) {
        // Actualizar ambas instancias del estado del servicio
        [serviceStatusElement, serviceStatusElement2].forEach(el => {
          if (!el) return;
          
          // Actualizar clases y texto
          el.className = 'status-value ' + 
            (status === 'running' ? 'running' : status === 'stopped' ? 'stopped' : 'unknown');
          
          el.innerHTML = \`
            <span class="status-icon">
              \${status === 'running' ? '&#xE930;' : status === 'stopped' ? '&#xE71A;' : '&#xE9CE;'}
            </span>
            \${status === 'running' ? 'En ejecución' : status === 'stopped' ? 'Detenido' : 'Estado desconocido'}
          \`;
        });
        
        // Actualizar estado de todos los botones
        [startBtn, startBtn2].forEach(btn => {
          if (btn) btn.disabled = status !== 'stopped';
        });
        
        [stopBtn, stopBtn2].forEach(btn => {
          if (btn) btn.disabled = status !== 'running';
        });
        
        if (installBtn) installBtn.disabled = status !== 'unknown';
        if (uninstallBtn) uninstallBtn.disabled = status === 'unknown';
        
        // Iniciar o detener el temporizador según el estado
        if (status === 'running') {
          startCountdown();
        } else if (countdownInterval) {
          clearInterval(countdownInterval);
          resetCountdown();
        }
      }
      
      // Función para reiniciar el contador a ceros
      function resetCountdown() {
        document.getElementById('hours').textContent = '00';
        document.getElementById('minutes').textContent = '00';
        document.getElementById('seconds').textContent = '00';
      }
      
      // Función para iniciar el temporizador de cuenta regresiva
      function startCountdown() {
        // Calcular la próxima hora de actualización
        nextUpdateTime = new Date();
        nextUpdateTime.setHours(nextUpdateTime.getHours() + intervalHours);
        
        // Limpiar el intervalo anterior
        if (countdownInterval) {
          clearInterval(countdownInterval);
        }
        
        // Actualizar el contador cada segundo
        countdownInterval = setInterval(updateCountdown, 1000);
        updateCountdown(); // Actualizar inmediatamente
      }
      
      // Función para actualizar el contador
      function updateCountdown() {
        const now = new Date();
        const diff = nextUpdateTime.getTime() - now.getTime();
        
        if (diff <= 0) {
          // Si ya pasó el tiempo, reiniciar el temporizador
          startCountdown();
          return;
        }
        
        // Calcular horas, minutos y segundos
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        // Actualizar elementos en el DOM
        document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
        document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
      }
      
      // Función para mostrar notificación toast
      function showToast(title, message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        
        toast.innerHTML = \`
          <div class="toast-title">\${title}</div>
          <div class="toast-message">\${message}</div>
        \`;
        
        toastContainer.appendChild(toast);
        
        // Auto destruir después de 5 segundos
        setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transform = 'translateX(100%)';
          setTimeout(() => {
            if (toastContainer.contains(toast)) {
              toastContainer.removeChild(toast);
            }
          }, 300);
        }, 5000);
      }
      
      // Función para mostrar estado de carga en botones
      function setButtonLoading(button, isLoading) {
        if (!button) return;
        
        const spinner = button.querySelector('.spinner');
        if (!spinner) return;
        
        if (isLoading) {
          button.disabled = true;
          spinner.style.display = 'inline-block';
        } else {
          button.disabled = false;
          spinner.style.display = 'none';
        }
      }
      
      // Función para cargar información del sistema
      async function loadSystemInfo() {
        try {
          // Información del sistema operativo
          osInfoElement.textContent = os.type() + ' ' + os.release();
          
          // Información del procesador
          cpuInfoElement.textContent = os.cpus()[0].model;
          
          // Información de memoria RAM
          const totalRam = Math.round(os.totalmem() / (1024 * 1024 * 1024));
          const freeRam = Math.round(os.freemem() / (1024 * 1024 * 1024));
          ramInfoElement.textContent = \`\${freeRam} GB / \${totalRam} GB\`;
          
          // Información de red
          let networkInterfaces = os.networkInterfaces();
          let ipAddress = 'No disponible';
          let macAddress = 'No disponible';
          
          // Buscar la interfaz de red principal
          for (const name in networkInterfaces) {
            for (const iface of networkInterfaces[name]) {
              // Filtrar las interfaces IPv4 que no sean internas
              if (iface.family === 'IPv4' && !iface.internal) {
                ipAddress = iface.address;
                macAddress = iface.mac;
                break;
              }
            }
            if (ipAddress !== 'No disponible') break;
          }
          
          networkInfoElement.textContent = \`\${ipAddress} / \${macAddress}\`;
          
          // Información de servidor
          serverAddressElement.textContent = await getServerAddress();
          
          // Información de arquitectura
          archInfoElement.textContent = os.arch();
          
          // Directorio de logs
          const logDir = path.join(os.homedir(), 'AppData', 'Local', 'SystemInfoAgent', 'logs');
          logPathElement.textContent = logDir;
          
          // Cargar eventos recientes
          loadRecentEvents();
          
        } catch (error) {
          console.error('Error al cargar información del sistema:', error);
          showToast('Error', 'No se pudo cargar la información del sistema', 'error');
        }
      }
      
      // Función para obtener la dirección del servidor de la base de datos
      async function getServerAddress() {
        try {
          const appDir = path.dirname(process.execPath);
          const configPath = path.join(appDir, 'config.json');
          
          // Si no podemos obtener la configuración, usar un valor por defecto
          return 'gamez-solutions.ddns.net';
        } catch (error) {
          console.error('Error al obtener dirección del servidor:', error);
          return 'No disponible';
        }
      }
      
      // Función para cargar eventos recientes
      function loadRecentEvents() {
        // Ejemplos de eventos para demostración
        const events = [
          { date: new Date(), type: 'info', message: 'Aplicación iniciada' },
          { date: new Date(Date.now() - 30 * 60 * 1000), type: 'success', message: 'Información recopilada correctamente' },
          { date: new Date(Date.now() - 6 * 60 * 60 * 1000), type: 'info', message: 'Servicio iniciado' }
        ];
        
        // Limpiar contenedor
        eventsContainer.innerHTML = '';
        
        // Mostrar eventos
        events.forEach(event => {
          const eventElement = document.createElement('div');
          eventElement.className = 'info-item';
          
          const timeString = event.date.toLocaleTimeString() + ' ' + event.date.toLocaleDateString();
          
          eventElement.innerHTML = \`
            <div class="info-label">\${timeString}</div>
            <div class="info-value \${event.type}">\${event.message}</div>
          \`;
          
          eventsContainer.appendChild(eventElement);
        });
        
        // Si no hay eventos, mostrar mensaje
        if (events.length === 0) {
          eventsContainer.innerHTML = '<div class="info-item"><div class="info-label">No hay eventos recientes</div></div>';
        }
      }
      
      // Control de la ventana
      minimizeButton.addEventListener('click', () => {
        ipcRenderer.send('minimize-window');
      });
      
      closeButton.addEventListener('click', () => {
        ipcRenderer.send('close-window');
      });
      
      // Configurar eventos para navegación
      document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
          const tabId = item.getAttribute('data-tab');
          switchTab(tabId);
        });
      });
      
      // Funcionalidad de botones compartida para ambas pestañas
      [startBtn, startBtn2].forEach(btn => {
        if (!btn) return;
        
        btn.addEventListener('click', async () => {
          try {
            setButtonLoading(startBtn, true);
            setButtonLoading(startBtn2, true);
            
            await execAsync('net start "SystemInfoAgent"');
            updateUI('running');
            showToast('Servicio iniciado', 'El servicio se ha iniciado correctamente', 'success');
          } catch (error) {
            showToast('Error', 'No se pudo iniciar el servicio: ' + error.message, 'error');
          } finally {
            setButtonLoading(startBtn, false);
            setButtonLoading(startBtn2, false);
          }
        });
      });
      
      [stopBtn, stopBtn2].forEach(btn => {
        if (!btn) return;
        
        btn.addEventListener('click', async () => {
          try {
            setButtonLoading(stopBtn, true);
            setButtonLoading(stopBtn2, true);
            
            await execAsync('net stop "SystemInfoAgent"');
            updateUI('stopped');
            showToast('Servicio detenido', 'El servicio se ha detenido correctamente', 'info');
          } catch (error) {
            showToast('Error', 'No se pudo detener el servicio: ' + error.message, 'error');
          } finally {
            setButtonLoading(stopBtn, false);
            setButtonLoading(stopBtn2, false);
          }
        });
      });
      
      [refreshBtn, refreshBtn2].forEach(btn => {
        if (!btn) return;
        
        btn.addEventListener('click', async () => {
          try {
            setButtonLoading(refreshBtn, true);
            setButtonLoading(refreshBtn2, true);
            
            const { stdout } = await execAsync('sc query "SystemInfoAgent"');
            const status = stdout.includes('RUNNING') ? 'running' : 
                       stdout.includes('STOPPED') ? 'stopped' : 'unknown';
            updateUI(status);
            showToast('Estado actualizado', 'El estado del servicio se ha actualizado', 'info');
          } catch (error) {
            updateUI('unknown');
            showToast('Error', 'No se pudo verificar el estado: ' + error.message, 'error');
          } finally {
            setButtonLoading(refreshBtn, false);
            setButtonLoading(refreshBtn2, false);
          }
        });
      });
      
      // Eventos para botones de instalación/desinstalación
      installBtn.addEventListener('click', async () => {
        try {
          setButtonLoading(installBtn, true);
          toggleLoading(true);
          
          await execAsync(\`"\${process.execPath}" --install-service\`);
          updateUI('stopped');
          showToast('Servicio instalado', 'El servicio se ha instalado correctamente', 'success');
        } catch (error) {
          showToast('Error', 'No se pudo instalar el servicio: ' + error.message, 'error');
        } finally {
          setButtonLoading(installBtn, false);
          toggleLoading(false);
        }
      });
      
      uninstallBtn.addEventListener('click', async () => {
        try {
          setButtonLoading(uninstallBtn, true);
          toggleLoading(true);
          
          await execAsync(\`"\${process.execPath}" --uninstall-service\`);
          updateUI('unknown');
          showToast('Servicio desinstalado', 'El servicio se ha desinstalado correctamente', 'info');
        } catch (error) {
          showToast('Error', 'No se pudo desinstalar el servicio: ' + error.message, 'error');
        } finally {
          setButtonLoading(uninstallBtn, false);
          toggleLoading(false);
        }
      });
      
      // Evento para botón de recopilación
      collectBtn.addEventListener('click', async () => {
        try {
          setButtonLoading(collectBtn, true);
          toggleLoading(true);
          
          const result = await ipcRenderer.invoke('collect-system-info');
          
          if (result.success) {
            showToast('Recopilación completada', 'La información del sistema ha sido recopilada y guardada correctamente', 'success');
            
            // Reiniciar el temporizador
            startCountdown();
            
            // Recargar eventos recientes
            loadRecentEvents();
          } else {
            showToast('Error', 'Error al recopilar información: ' + result.message, 'error');
          }
        } catch (error) {
          showToast('Error', 'Error al ejecutar la recopilación: ' + error.message, 'error');
        } finally {
          setButtonLoading(collectBtn, false);
          toggleLoading(false);
        }
      });
      
      // Botón de prueba de conexión
      document.getElementById('testConnectionBtn').addEventListener('click', async () => {
        try {
          const btn = document.getElementById('testConnectionBtn');
          btn.disabled = true;
          btn.textContent = 'Probando conexión...';
          
          // Simular prueba de conexión
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          showToast('Conexión exitosa', 'Se ha establecido conexión con el servidor correctamente', 'success');
        } catch (error) {
          showToast('Error de conexión', 'No se pudo conectar al servidor: ' + error.message, 'error');
        } finally {
          const btn = document.getElementById('testConnectionBtn');
          btn.disabled = false;
          btn.textContent = 'Probar Conexión';
        }
      });
      
      // Escuchar eventos de notificaciones desde el proceso principal
      ipcRenderer.on('show-toast', (event, { title, message, type }) => {
        showToast(title, message, type || 'info');
      });
      
      // Inicializar la aplicación
      document.addEventListener('DOMContentLoaded', async () => {
        try {
          // Cargar información del sistema
          await loadSystemInfo();
          
          // Si el servicio está en ejecución, iniciar el temporizador
          if ('${serviceStatus}' === 'running') {
            startCountdown();
          } else {
            resetCountdown();
          }
          
          // Preparar spinners
          document.querySelectorAll('.button').forEach(button => {
            const spinner = button.querySelector('.spinner');
            if (spinner) {
              spinner.style.display = 'none';
            }
          });
        } catch (error) {
          console.error('Error al inicializar la aplicación:', error);
        }
      });
    </script>
  </body>
  </html>`;
    // Escribir el HTML al archivo
    fs.writeFileSync(htmlPath, htmlContent);
    // Cargar el archivo HTML
    mainWindow.loadFile(htmlPath);
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    // Configurar los manejadores de IPC para la ventana
    setupWindowIPC();
    // Mostrar la ventana cuando esté lista para mostrar
    mainWindow.once('ready-to-show', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
    // Abrir DevTools en desarrollo para depuración
    if (!electron_1.app.isPackaged) {
        mainWindow.webContents.openDevTools();
    }
    // Agregar detector de errores para diagnosticar problemas
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        logger_1.logger.error(`Error al cargar ventana: ${errorDescription} (${errorCode})`);
    });
}
// Añadir al inicio del archivo, después de las importaciones
let ipcHandlersRegistered = false;
// Reemplazar la función setupWindowIPC por esta versión mejorada
function setupWindowIPC() {
    // Este manejador ya no registra 'collect-system-info' aquí
    // Solo configuramos los eventos relacionados con la ventana
    electron_1.ipcMain.on('minimize-window', () => {
        if (mainWindow) {
            mainWindow.minimize();
        }
    });
    electron_1.ipcMain.on('close-window', () => {
        if (mainWindow) {
            mainWindow.hide();
        }
    });
}
// MODIFICACIÓN 3: Añadir una nueva función para registrar el manejador de collect-system-info una sola vez
// Debe estar fuera de cualquier otra función para evitar registros repetidos
function setupCollectInfoHandler() {
    // Primero asegurarnos de quitar cualquier manejador existente
    try {
        electron_1.ipcMain.removeHandler('collect-system-info');
    }
    catch (error) {
        // Si no existía un manejador, esto podría lanzar un error que ignoramos
        logger_1.logger.debug('No había manejador previo para eliminar');
    }
    // Ahora registramos el manejador
    electron_1.ipcMain.handle('collect-system-info', async () => {
        return await collectSystemInfo();
    });
    logger_1.logger.info('Manejador collect-system-info registrado correctamente');
}
// Modificar la función showToastNotification para que funcione con la nueva UI
function showToastNotification(title, message, type = 'info') {
    // Registrar en logs
    logger_1.logger.info(`Notificación: ${title} - ${message}`);
    // Si hay una ventana principal y está en pantalla, enviar mensaje para mostrar toast
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('show-toast', { title, message, type });
        return;
    }
    // Si no hay una ventana principal o está cerrada, usamos notificaciones nativas
    const iconPath = getIconPath();
    let notificationIcon;
    // Si tenemos un ícono y podemos cargarlo, lo utilizamos
    if (iconPath) {
        try {
            notificationIcon = electron_1.nativeImage.createFromPath(iconPath);
            if (notificationIcon.isEmpty()) {
                logger_1.logger.warn('El ícono para notificaciones está vacío, se usará ícono por defecto.');
                notificationIcon = undefined;
            }
        }
        catch (error) {
            logger_1.logger.error(`Error al cargar ícono para notificación: ${error}`);
            notificationIcon = undefined;
        }
    }
    const notification = new electron_1.Notification({
        title,
        body: message,
        icon: notificationIcon,
        silent: false
    });
    notification.show();
    setTimeout(() => {
        notification.close();
    }, 5000);
}
