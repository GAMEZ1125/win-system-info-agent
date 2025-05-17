import { app, BrowserWindow, Tray, Menu, nativeImage, dialog, ipcMain, Notification } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './utils/logger';
import { App as SystemInfoApp } from './app'; // Importar la aplicación principal

// Instancia de la aplicación principal (solo se crea cuando se ejecuta la recopilación desde la UI)
let systemInfoApp: SystemInfoApp | null = null;

// Extender la interfaz App para incluir la propiedad isQuitting
declare global {
  namespace Electron {
    interface App {
      isQuitting?: boolean;
    }
  }
}

// Eliminar la importación de electron-is-dev y usar app.isPackaged en su lugar
const isDev = !app.isPackaged;

const execAsync = promisify(exec);

// Mantén una referencia global al objeto Tray, si no lo haces,
// el ícono desaparecerá cuando el garbage collector se ejecute
let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;

// Variables para el servicio
const serviceName = 'SystemInfoAgent';
let serviceStatus: 'running' | 'stopped' | 'unknown' = 'unknown';

// Inicializar la propiedad isQuitting
app.isQuitting = false;

// Asegurar que solo se ejecute una instancia de la aplicación
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Alguien intentó ejecutar una segunda instancia, enfocamos nuestra ventana
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Crea la ventana principal y la bandeja cuando Electron esté listo
  app.whenReady().then(() => {
    createTray();
    checkServiceStatus();

    // Configurar IPC para recibir mensajes desde la ventana
    setupIPC();

    app.on('activate', function () {
      // En macOS es común re-crear una ventana en la aplicación cuando
      // el ícono del dock es clickeado y no hay otras ventanas abiertas.
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  // Salir cuando todas las ventanas estén cerradas, excepto en macOS
  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
      // No queremos salir cuando se cierre una ventana
      // solo las ocultamos para que la aplicación siga corriendo en bandeja
    }
  });

  // Este método evitará que la aplicación se cierre cuando se presione X
  app.on('before-quit', async (event) => {
    // Si el usuario está intentando cerrar la app completamente, mostrar un diálogo
    if (!app.isQuitting) {
      event.preventDefault();
      const result = await dialog.showMessageBox({
        type: 'question',
        buttons: ['Minimizar a la bandeja', 'Cerrar'],
        title: 'Confirmación',
        message: '¿Estás seguro de que quieres cerrar la aplicación?',
        detail: 'La aplicación seguirá ejecutándose en segundo plano. Si deseas cerrarla completamente, hazlo desde el menú de la bandeja del sistema.'
      });
      
      if (result.response === 1) {
        app.isQuitting = true;
        
        // Si hay una instancia de la aplicación principal, cerrarla correctamente
        if (systemInfoApp) {
          await systemInfoApp.shutdown();
          systemInfoApp = null;
        }
        
        app.quit();
      }
    }
  });
}

// Función para recopilar información desde la UI
async function collectSystemInfo() {
  try {
    if (!systemInfoApp) {
      systemInfoApp = new SystemInfoApp({
        notifyEnabled: true,
        notifyCallback: showToastNotification
      });
      await systemInfoApp.initialize();
    } else {
      // Solo ejecutar la recopilación
      await systemInfoApp.collectAndSaveSystemInfo();
    }
    return { success: true, message: 'Información recopilada correctamente' };
  } catch (error) {
    logger.error(`Error al recopilar información: ${error}`);
    return { success: false, message: String(error) };
  }
}

// Configurar IPC para comunicación entre proceso principal y renderer
function setupIPC() {
  // Manejar la solicitud de actualizar manualmente la información del sistema
  ipcMain.handle('collect-system-info', async () => {
    return await collectSystemInfo();
  });
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
        path.join(app.getAppPath(), 'resources', iconName),
        // Ruta para resources en directorio de instalación
        path.join(path.dirname(process.execPath), 'resources', iconName),
        // Ruta absoluta para depuración
        path.join(process.cwd(), 'resources', iconName),
        // Directamente en la carpeta de la aplicación
        path.join(app.getAppPath(), iconName),
        // En extraResources
        path.join(app.getAppPath(), '..', 'resources', iconName)
      );
    }
    
    // Registrar todas las rutas que estamos verificando
    logger.info(`Buscando ícono en ${possiblePaths.length} ubicaciones posibles`);
    
    // Buscar en todas las rutas posibles
    for (const iconPath of possiblePaths) {
      if (fs.existsSync(iconPath)) {
        logger.info(`Ícono encontrado en: ${iconPath}`);
        return iconPath;
      }
    }
    
    // Si no se encuentra, registrar todas las rutas que intentamos
    logger.warn(`No se encontró el ícono en ninguna ubicación. Rutas probadas: ${possiblePaths.join(', ')}`);
    return null;
  } catch (error) {
    logger.error(`Error al buscar el ícono: ${error}`);
    return null;
  }
}

async function checkServiceStatus() {
  try {
    const { stdout } = await execAsync(`sc query "${serviceName}"`);
    
    if (stdout.includes('RUNNING')) {
      serviceStatus = 'running';
    } else if (stdout.includes('STOPPED')) {
      serviceStatus = 'stopped';
    } else {
      serviceStatus = 'unknown';
    }
    
    // Actualizar el menú del tray para reflejar el estado actual
    updateTrayMenu();
    
    logger.info(`Estado del servicio: ${serviceStatus}`);
  } catch (error) {
    // Si hay un error, probablemente el servicio no está instalado
    serviceStatus = 'unknown';
    updateTrayMenu();
    logger.error(`Error al verificar estado del servicio: ${error}`);
  }
}

async function startService() {
  try {
    await execAsync(`net start "${serviceName}"`);
    logger.info('Servicio iniciado correctamente');
    serviceStatus = 'running';
    updateTrayMenu();
  } catch (error) {
    logger.error(`Error al iniciar servicio: ${error}`);
    dialog.showErrorBox('Error', `No se pudo iniciar el servicio: ${error}`);
  }
}

async function stopService() {
  try {
    await execAsync(`net stop "${serviceName}"`);
    logger.info('Servicio detenido correctamente');
    serviceStatus = 'stopped';
    updateTrayMenu();
  } catch (error) {
    logger.error(`Error al detener servicio: ${error}`);
    dialog.showErrorBox('Error', `No se pudo detener el servicio: ${error}`);
  }
}

function createTray() {
  // Registrar información de directorios para diagnóstico
  logger.info(`Directorio actual: ${process.cwd()}`);
  logger.info(`Directorio de la aplicación: ${app.getAppPath()}`);
  logger.info(`Directorio de recursos: ${process.resourcesPath || 'no disponible'}`);
  logger.info(`Ruta del ejecutable: ${process.execPath}`);
  
  const iconPath = getIconPath();
  logger.info(`Ruta del ícono obtenida: ${iconPath || 'No se encontró'}`);
  
  let icon: Electron.NativeImage;
  
  if (iconPath) {
    try {
      // Crear imagen nativa a partir del archivo
      icon = nativeImage.createFromPath(iconPath);
      
      // Verificar si la imagen está vacía
      if (icon.isEmpty()) {
        logger.error(`El ícono en ${iconPath} está vacío o no se pudo cargar correctamente`);
        
        // Crear un icono genérico si el encontrado está vacío
        const genericIconBuffer = Buffer.alloc(16 * 16 * 4);
        for (let i = 0; i < genericIconBuffer.length; i += 4) {
          // RGBA: azul/verde
          genericIconBuffer[i] = 0;      // R
          genericIconBuffer[i + 1] = 120; // G
          genericIconBuffer[i + 2] = 200; // B
          genericIconBuffer[i + 3] = 200; // A
        }
        icon = nativeImage.createFromBuffer(genericIconBuffer, {
          width: 16,
          height: 16
        });
        logger.info('Creado icono genérico como fallback');
      } else {
        // El icono se cargó correctamente, redimensionarlo específicamente para la bandeja
        const sizes = icon.getSize();
        logger.info(`Tamaño original del icono: ${sizes.width}x${sizes.height}`);
        
        // Redimensionar a 16x16 para la bandeja del sistema en Windows
        const resizedIcon = icon.resize({ width: 16, height: 16 });
        
        if (!resizedIcon.isEmpty()) {
          icon = resizedIcon;
          logger.info('Ícono redimensionado correctamente a 16x16');
        } else {
          logger.warn('No se pudo redimensionar el icono, usando original');
        }
      }
    } catch (error) {
      logger.error(`Error al procesar el ícono: ${error}`);
      // Crear un icono genérico en caso de error
      const genericIconBuffer = Buffer.alloc(16 * 16 * 4);
      for (let i = 0; i < genericIconBuffer.length; i += 4) {
        // RGBA: rojo (para indicar error)
        genericIconBuffer[i] = 200;      // R
        genericIconBuffer[i + 1] = 0;    // G
        genericIconBuffer[i + 2] = 0;    // B
        genericIconBuffer[i + 3] = 200;  // A
      }
      icon = nativeImage.createFromBuffer(genericIconBuffer, {
        width: 16,
        height: 16
      });
    }
  } else {
    logger.error('No se encontró el archivo de ícono en ninguna ubicación conocida');
    
    // Crear un icono genérico cuando no se encuentra el archivo
    const genericIconBuffer = Buffer.alloc(16 * 16 * 4);
    for (let i = 0; i < genericIconBuffer.length; i += 4) {
      // RGBA: gris
      genericIconBuffer[i] = 150;      // R
      genericIconBuffer[i + 1] = 150;  // G
      genericIconBuffer[i + 2] = 150;  // B
      genericIconBuffer[i + 3] = 200;  // A
    }
    icon = nativeImage.createFromBuffer(genericIconBuffer, {
      width: 16,
      height: 16
    });
    logger.info('Creado icono genérico porque no se encontró un archivo');
  }
  
  // Crear el tray con el icono preparado
  tray = new Tray(icon);
  tray.setToolTip('System Info Agent');
  updateTrayMenu();
  
  // Cuando se haga doble clic en el ícono del tray, mostrar la ventana de estado
  tray.on('double-click', createWindow);
  
  logger.info('Tray creado correctamente');
}

function updateTrayMenu() {
  if (!tray) return;

  const statusText = serviceStatus === 'running' 
    ? 'Servicio: En ejecución' 
    : serviceStatus === 'stopped' 
      ? 'Servicio: Detenido' 
      : 'Servicio: Estado desconocido';

  const menu = Menu.buildFromTemplate([
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
        } else {
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
            showToastNotification(
              'Recopilación de Información', 
              'Se ha enviado la solicitud de recopilación al servicio.'
            );
          } else {
            // Si el servicio no está corriendo, ejecuta la recopilación directamente usando la función común
            const result = await collectSystemInfo();
            if (result.success) {
              showToastNotification(
                'Recopilación de Información', 
                'Información recopilada correctamente'
              );
            } else {
              showToastNotification(
                'Error', 
                `Error al recopilar información: ${result.message}`
              );
            }
          }
        } catch (error) {
          logger.error(`Error al ejecutar recopilación: ${error}`);
          showToastNotification(
            'Error', 
            `No se pudo ejecutar la recopilación: ${error}`
          );
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Instalar Servicio', 
      click: async () => {
        try {
          await execAsync(`"${process.execPath}" --install-service`);
          dialog.showMessageBox({
            type: 'info',
            title: 'Instalación de Servicio',
            message: 'El servicio se ha instalado correctamente.'
          });
          checkServiceStatus();
        } catch (error) {
          logger.error(`Error al instalar servicio: ${error}`);
          dialog.showErrorBox('Error', `No se pudo instalar el servicio: ${error}`);
        }
      },
      enabled: serviceStatus === 'unknown'
    },
    { 
      label: 'Desinstalar Servicio', 
      click: async () => {
        try {
          await execAsync(`"${process.execPath}" --uninstall-service`);
          dialog.showMessageBox({
            type: 'info',
            title: 'Desinstalación de Servicio',
            message: 'El servicio se ha desinstalado correctamente.'
          });
          serviceStatus = 'unknown';
          updateTrayMenu();
        } catch (error) {
          logger.error(`Error al desinstalar servicio: ${error}`);
          dialog.showErrorBox('Error', `No se pudo desinstalar el servicio: ${error}`);
        }
      },
      enabled: serviceStatus !== 'unknown'
    },
    { type: 'separator' },
    { 
      label: 'Salir', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(menu);
}

// Modificar la función createWindow para agregar un botón de recopilación manual
function createWindow() {
  // Evita crear múltiples ventanas
  if (mainWindow) {
    mainWindow.show();
    return;
  }

  // Obtener la ruta del icono y manejar el caso null
  const iconPath = getIconPath();
  // Convertir null a undefined para satisfacer el tipo esperado
  const iconOption = iconPath || undefined;

  mainWindow = new BrowserWindow({
    width: 500,
    height: 450, // Aumentar la altura para el nuevo botón
    resizable: false,
    icon: iconOption,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // HTML modificado para incluir el botón de recopilación manual
  mainWindow.loadURL(`data:text/html;charset=utf-8,
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>System Info Agent</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
          color: #333;
        }
        h1 {
          font-size: 22px;
          margin-bottom: 20px;
        }
        .logo {
          text-align: center;
          margin-bottom: 20px;
        }
        .logo img {
          width: 80px;
          height: 80px;
        }
        .status-panel {
          background-color: white;
          border-radius: 5px;
          padding: 15px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .status-label {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .status-value {
          padding: 8px;
          margin-bottom: 10px;
          border-radius: 3px;
        }
        .running {
          background-color: #d4edda;
          color: #155724;
        }
        .stopped {
          background-color: #f8d7da;
          color: #721c24;
        }
        .unknown {
          background-color: #fff3cd;
          color: #856404;
        }
        .button-row {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
        }
        button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        .start-btn {
          background-color: #28a745;
          color: white;
        }
        .stop-btn {
          background-color: #dc3545;
          color: white;
        }
        .status-btn {
          background-color: #17a2b8;
          color: white;
        }
        .install-btn {
          background-color: #6c757d;
          color: white;
        }
        .uninstall-btn {
          background-color: #6c757d;
          color: white;
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .collect-btn {
          background-color: #007bff;
          color: white;
          width: 100%;
          margin-top: 10px;
        }
        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #6c757d;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="logo">
        <h1>System Info Agent</h1>
      </div>
      
      <div class="status-panel">
        <div class="status-label">Estado del Servicio:</div>
        <div id="serviceStatus" class="status-value ${
          serviceStatus === 'running' ? 'running' : 
          serviceStatus === 'stopped' ? 'stopped' : 'unknown'
        }">
          ${
            serviceStatus === 'running' ? 'En ejecución' : 
            serviceStatus === 'stopped' ? 'Detenido' : 'Estado desconocido'
          }
        </div>
        
        <div class="button-row">
          <button id="startBtn" class="start-btn" ${serviceStatus !== 'stopped' ? 'disabled' : ''}>
            Iniciar Servicio
          </button>
          <button id="stopBtn" class="stop-btn" ${serviceStatus !== 'running' ? 'disabled' : ''}>
            Detener Servicio
          </button>
          <button id="refreshBtn" class="status-btn">
            Actualizar Estado
          </button>
        </div>
      </div>
      
      <div class="status-panel">
        <div class="status-label">Opciones de Servicio:</div>
        <div class="button-row">
          <button id="installBtn" class="install-btn" ${serviceStatus !== 'unknown' ? 'disabled' : ''}>
            Instalar Servicio
          </button>
          <button id="uninstallBtn" class="uninstall-btn" ${serviceStatus === 'unknown' ? 'disabled' : ''}>
            Desinstalar Servicio
          </button>
        </div>
        
        <button id="collectBtn" class="collect-btn">
          Ejecutar Recopilación de Información Ahora
        </button>
      </div>
      
      <div class="footer">
        SystemInfoAgent v1.0.0
      </div>
      
      <script>
        // Obtener referencias a los botones (existentes)
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const refreshBtn = document.getElementById('refreshBtn');
        const installBtn = document.getElementById('installBtn');
        const uninstallBtn = document.getElementById('uninstallBtn');
        const serviceStatusElement = document.getElementById('serviceStatus');
        const collectBtn = document.getElementById('collectBtn');
        
        // Acceso a la API de Node.js y Electron
        const { ipcRenderer } = require('electron');
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);
        
        // Función para actualizar el UI
        function updateUI(status) {
          serviceStatusElement.className = 'status-value ' + 
            (status === 'running' ? 'running' : status === 'stopped' ? 'stopped' : 'unknown');
          
          serviceStatusElement.textContent = 
            status === 'running' ? 'En ejecución' : 
            status === 'stopped' ? 'Detenido' : 'Estado desconocido';
          
          startBtn.disabled = status !== 'stopped';
          stopBtn.disabled = status !== 'running';
          installBtn.disabled = status !== 'unknown';
          uninstallBtn.disabled = status === 'unknown';
        }
        
        // Manejar los eventos de los botones existentes...
        
        // Nuevo evento para el botón de recopilación manual
        collectBtn.addEventListener('click', async () => {
          collectBtn.disabled = true;
          collectBtn.textContent = 'Recopilando información...';
          
          try {
            // Utilizar IPC para comunicarse con el proceso principal
            const result = await ipcRenderer.invoke('collect-system-info');
            
            if (result.success) {
              // Crear una notificación en lugar de un alert
              const notification = new Notification('Recopilación de información', {
                body: 'La información del sistema ha sido recopilada y guardada correctamente.'
              });
            } else {
              // Para errores, mejor mantener un alert para asegurarse que el usuario lo ve
              alert('Error al recopilar información: ' + result.message);
            }
          } catch (error) {
            alert('Error al ejecutar la recopilación: ' + error.message);
          } finally {
            collectBtn.disabled = false;
            collectBtn.textContent = 'Ejecutar Recopilación de Información Ahora';
          }
        });
        
        // Resto del script JavaScript...
      </script>
    </body>
    </html>
  `);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Añadir esta función después de las otras funciones de utilidad

// Función para mostrar notificaciones informativas no intrusivas
function showToastNotification(title: string, message: string) {
  const iconPath = getIconPath();
  let notificationIcon: Electron.NativeImage | undefined;
  
  // Si tenemos un ícono y podemos cargarlo, lo utilizamos
  if (iconPath) {
    try {
      notificationIcon = nativeImage.createFromPath(iconPath);
      if (notificationIcon.isEmpty()) {
        logger.warn('El ícono para notificaciones está vacío, se usará ícono por defecto.');
        notificationIcon = undefined;
      }
    } catch (error) {
      logger.error(`Error al cargar ícono para notificación: ${error}`);
      notificationIcon = undefined;
    }
  }
  
  // Si no hay una ventana principal o está enfocada, usamos notificaciones nativas
  if (!mainWindow || !mainWindow.isFocused()) {
    const notification = new Notification({
      title,
      body: message,
      icon: notificationIcon,
      silent: false
    });
    
    // Log para depuración
    logger.info(`Mostrando notificación: "${title}" - Ícono: ${iconPath || 'ninguno'}`);
    
    notification.show();
    
    // Autodestruir después de 5 segundos
    setTimeout(() => {
      notification.close();
    }, 5000);
    
    return;
  }
  
  // Si la ventana está abierta y enfocada, podemos mostrar una notificación dentro de la ventana
  // usando un script temporal
  mainWindow.webContents.executeJavaScript(`
    (function() {
      // Crear el elemento de notificación
      const toast = document.createElement('div');
      toast.style.position = 'fixed';
      toast.style.bottom = '20px';
      toast.style.right = '20px';
      toast.style.backgroundColor = 'rgba(49, 49, 49, 0.9)';
      toast.style.color = 'white';
      toast.style.padding = '12px 20px';
      toast.style.borderRadius = '4px';
      toast.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
      toast.style.zIndex = '1000';
      toast.style.transition = 'opacity 0.5s ease';
      toast.style.opacity = '0';
      
      // Título
      const titleEl = document.createElement('div');
      titleEl.style.fontWeight = 'bold';
      titleEl.style.marginBottom = '5px';
      titleEl.textContent = "${title}";
      toast.appendChild(titleEl);
      
      // Mensaje
      const messageEl = document.createElement('div');
      messageEl.textContent = "${message}";
      toast.appendChild(messageEl);
      
      // Añadir al DOM
      document.body.appendChild(toast);
      
      // Animar entrada
      setTimeout(() => { toast.style.opacity = '1'; }, 100);
      
      // Autodestruir después de 5 segundos
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 500);
      }, 5000);
    })();
  `).catch(err => logger.error('Error al mostrar notificación en ventana:', err));
}