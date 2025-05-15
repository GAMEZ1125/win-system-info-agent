import { DataTypes, Model, Sequelize } from 'sequelize';

export interface SystemInfoAttributes {
  id?: number;
  computerName: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  processor: string;
  ramTotal: string;
  storageTotal: string;
  storageUsed: string;
  storageFree: string;
  operatingSystem: string;
  osServicePack: string;
  osProductKey: string;
  deviceType: string;
  lastLogonUser: string;
  lastBootTime: Date;
  clientId: string;
  ipAddress: string;
  macAddress: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SystemInfo extends Model<SystemInfoAttributes> implements SystemInfoAttributes {
  public id!: number;
  public computerName!: string;
  public manufacturer!: string;
  public model!: string;
  public serialNumber!: string;
  public processor!: string;
  public ramTotal!: string;
  public storageTotal!: string;
  public storageUsed!: string;
  public storageFree!: string;
  public operatingSystem!: string;
  public osServicePack!: string;
  public osProductKey!: string;
  public deviceType!: string;
  public lastLogonUser!: string;
  public lastBootTime!: Date;
  public clientId!: string;
  public ipAddress!: string;
  public macAddress!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize(sequelize: Sequelize): void {
    SystemInfo.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        computerName: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        manufacturer: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        model: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        serialNumber: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        processor: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        ramTotal: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        storageTotal: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        storageUsed: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        storageFree: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        operatingSystem: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        osServicePack: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        osProductKey: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        deviceType: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        lastLogonUser: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        lastBootTime: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        clientId: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        ipAddress: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        macAddress: {
          type: DataTypes.STRING,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'system_info',
        timestamps: true,
      }
    );
  }
}