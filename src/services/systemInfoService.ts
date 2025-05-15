import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as si from 'systeminformation';
import { PowerShell } from 'node-powershell';
import { SystemInfoAttributes } from '../models/systemInfo';
import { logger } from '../utils/logger';

const execPromise = promisify(exec);

export class SystemInfoService {
  private async runPowerShellCommand(command: string): Promise<string> {
    // Usar solo las opciones soportadas por la versión actual de la biblioteca
    const ps = new PowerShell({
      debug: false,
      pwsh: false // usar PowerShell clásico en lugar de PowerShell Core
    });

    try {
      // En la nueva versión se pasa el comando directamente a invoke
      const result = await ps.invoke(command);
      return result.raw.trim();
    } catch (error) {
      logger.error(`Error al ejecutar comando PowerShell: ${error}`);
      return '';
    } finally {
      // Siempre cerrar la instancia de PowerShell
      await ps.dispose();
    }
  }

  private async getManufacturer(): Promise<string> {
    return this.runPowerShellCommand('(Get-WmiObject -Class Win32_ComputerSystem).Manufacturer');
  }

  private async getModel(): Promise<string> {
    return this.runPowerShellCommand('(Get-WmiObject -Class Win32_ComputerSystem).Model');
  }

  private async getSerialNumber(): Promise<string> {
    return this.runPowerShellCommand('(Get-WmiObject -Class Win32_BIOS).SerialNumber');
  }

  private async getOSProductKey(): Promise<string> {
    const command = `
      $regPath = 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SoftwareProtectionPlatform'
      $key = ''
      try {
        if (Test-Path $regPath) {
          $key = (Get-ItemProperty -Path $regPath -Name BackupProductKeyDefault -ErrorAction Stop).BackupProductKeyDefault
        }
      } catch {}
      $key
    `;
    return this.runPowerShellCommand(command);
  }

  private async getOSServicePack(): Promise<string> {
    return this.runPowerShellCommand('(Get-WmiObject -Class Win32_OperatingSystem).ServicePackMajorVersion');
  }

  private async getLastLogonUser(): Promise<string> {
    return this.runPowerShellCommand('(Get-WmiObject -Class Win32_ComputerSystem).UserName');
  }

  private async getDeviceType(): Promise<string> {
    const chassisType = await this.runPowerShellCommand(`
      $chassisType = (Get-WmiObject -Class Win32_SystemEnclosure).ChassisTypes[0]
      switch ($chassisType) {
        3 { "Desktop" }
        4 { "Desktop" }
        5 { "Desktop" }
        6 { "Desktop" }
        7 { "Desktop" }
        8 { "Laptop" }
        9 { "Laptop" }
        10 { "Laptop" }
        11 { "Laptop" }
        12 { "Laptop" }
        14 { "Laptop" }
        15 { "Desktop" }
        16 { "Desktop" }
        18 { "Laptop" }
        21 { "Laptop" }
        30 { "Laptop" }
        31 { "Laptop" }
        32 { "Laptop" }
        default { "Desconocido" }
      }
    `);
    return chassisType;
  }

  private async getMacAddress(): Promise<string> {
    try {
      const networkInterfaces = await si.networkInterfaces();
      // Corregir para manejar correctamente la respuesta de tipo array
      if (Array.isArray(networkInterfaces)) {
        // Filtrar solo interfaces físicas activas y obtener la primera MAC address
        const physicalInterface = networkInterfaces.find(
          (iface) => iface.type === 'wired' && iface.operstate === 'up' && iface.mac !== '00:00:00:00:00:00'
        ) || networkInterfaces.find(
          (iface) => iface.type === 'wireless' && iface.operstate === 'up' && iface.mac !== '00:00:00:00:00:00'
        );
        
        return physicalInterface?.mac || 'Unknown';
      }
      return 'Unknown';
    } catch (error) {
      logger.error(`Error al obtener dirección MAC: ${error}`);
      return 'Unknown';
    }
  }

  private async getIpAddress(): Promise<string> {
    try {
      const networkInterfaces = os.networkInterfaces();
      const ipAddress = Object.values(networkInterfaces)
        .flat()
        .filter((iface) => iface?.family === 'IPv4' && !iface.internal)
        .map((iface) => iface?.address)
        .find((address) => !!address);
      
      return ipAddress || 'Unknown';
    } catch (error) {
      logger.error(`Error al obtener dirección IP: ${error}`);
      return 'Unknown';
    }
  }

  private async getUniqueClientId(): Promise<string> {
    // Generar un ID único basado en el serial y MAC para identificar este equipo
    const serial = await this.getSerialNumber();
    const mac = await this.getMacAddress();
    return Buffer.from(`${serial}-${mac}`).toString('base64');
  }

  public async getSystemInfo(): Promise<SystemInfoAttributes> {
    try {
      logger.info('Comenzando la recopilación de información del sistema...');
      
      // Obtener información básica del sistema
      const cpuInfo = await si.cpu();
      const memInfo = await si.mem();
      const diskInfo = await si.fsSize();
      const osInfo = await si.osInfo();
      
      // Formatear RAM en GB
      const ramTotalGB = (memInfo.total / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
      
      // Calcular almacenamiento total, usado y libre (sumando todos los discos)
      const storageTotalGB = diskInfo.reduce((total, disk) => total + disk.size, 0) / (1024 * 1024 * 1024);
      const storageUsedGB = diskInfo.reduce((total, disk) => total + disk.used, 0) / (1024 * 1024 * 1024);
      const storageTotal = storageTotalGB.toFixed(2) + ' GB';
      const storageUsed = storageUsedGB.toFixed(2) + ' GB';
      const storageFree = (storageTotalGB - storageUsedGB).toFixed(2) + ' GB';
      
      // Obtener información específica de Windows usando PowerShell
      const manufacturer = await this.getManufacturer();
      const model = await this.getModel();
      const serialNumber = await this.getSerialNumber();
      const osProductKey = await this.getOSProductKey();
      const osServicePack = await this.getOSServicePack();
      const lastLogonUser = await this.getLastLogonUser();
      const deviceType = await this.getDeviceType();
      const macAddress = await this.getMacAddress();
      const ipAddress = await this.getIpAddress();
      const clientId = await this.getUniqueClientId();
      
      logger.info('Recopilación de información del sistema completada');
      
      return {
        computerName: os.hostname(),
        manufacturer: manufacturer || 'Unknown',
        model: model || 'Unknown',
        serialNumber: serialNumber || 'Unknown',
        processor: `${cpuInfo.manufacturer} ${cpuInfo.brand}`,
        ramTotal: ramTotalGB,
        storageTotal: storageTotal,
        storageUsed: storageUsed,
        storageFree: storageFree,
        operatingSystem: `${osInfo.distro} ${osInfo.release}`,
        osServicePack: osServicePack || 'N/A',
        osProductKey: osProductKey || 'N/A',
        deviceType: deviceType || 'Unknown',
        lastLogonUser: lastLogonUser || 'Unknown',
        lastBootTime: new Date(Date.now() - os.uptime() * 1000),
        clientId: clientId,
        ipAddress: ipAddress,
        macAddress: macAddress
      };
    } catch (error) {
      logger.error(`Error al obtener información del sistema: ${error}`);
      throw new Error(`Error al obtener información del sistema: ${error}`);
    }
  }
}