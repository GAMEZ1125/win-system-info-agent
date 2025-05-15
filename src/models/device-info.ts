export interface DeviceInfo {
    hostname: string;
    brand: string;
    model: string;
    serviceTag: string;
    processor: string;
    ram: string;
    storage: {
        total: string;
        used: string;
        status: string;
    };
    operatingSystem: string;
    osServicePack: string;
    osCdKey: string;
    deviceType: string;
    lastLogonUser: string;
    lastBootTime: Date;
}