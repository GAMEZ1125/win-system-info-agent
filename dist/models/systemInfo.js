"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemInfo = void 0;
const sequelize_1 = require("sequelize");
class SystemInfo extends sequelize_1.Model {
    static initialize(sequelize) {
        SystemInfo.init({
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            computerName: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            manufacturer: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            model: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            serialNumber: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            processor: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            ramTotal: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            storageTotal: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            storageUsed: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            storageFree: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            operatingSystem: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            osServicePack: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            osProductKey: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            deviceType: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            lastLogonUser: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            lastBootTime: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            clientId: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            ipAddress: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            macAddress: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            created_at: {
                type: sequelize_1.DataTypes.DATE,
                defaultValue: sequelize_1.Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: sequelize_1.DataTypes.DATE,
                defaultValue: sequelize_1.Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            }
        }, {
            sequelize,
            tableName: 'system_info',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            hooks: {
                beforeCreate: (record) => {
                    const colombiaDate = new Date();
                    record.dataValues.created_at = colombiaDate;
                    record.dataValues.updated_at = colombiaDate;
                },
                beforeUpdate: (record) => {
                    const colombiaDate = new Date();
                    record.dataValues.updated_at = colombiaDate;
                }
            }
        });
    }
}
exports.SystemInfo = SystemInfo;
