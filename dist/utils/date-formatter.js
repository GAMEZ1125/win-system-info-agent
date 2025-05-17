"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateFormatter = void 0;
/**
 * Utilidad para formatear fechas en zona horaria de Colombia (GMT-5)
 */
class DateFormatter {
    /**
     * Formatea una fecha en el formato deseado usando la zona horaria de Colombia
     * @param date Fecha a formatear
     * @param format Formato opcional (por defecto: 'YYYY-MM-DD HH:mm:ss')
     * @returns Fecha formateada como string
     */
    static formatToColombiaTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
        // Crear un objeto Date
        const dateObj = new Date(date);
        // Ajustar a GMT-5 (Colombia)
        const colombiaTime = new Date(dateObj.getTime() - (5 * 60 * 60 * 1000));
        // Formatear según el formato solicitado
        const year = colombiaTime.getUTCFullYear();
        const month = String(colombiaTime.getUTCMonth() + 1).padStart(2, '0');
        const day = String(colombiaTime.getUTCDate()).padStart(2, '0');
        const hours = String(colombiaTime.getUTCHours()).padStart(2, '0');
        const minutes = String(colombiaTime.getUTCMinutes()).padStart(2, '0');
        const seconds = String(colombiaTime.getUTCSeconds()).padStart(2, '0');
        // Reemplazar tokens en el formato
        return format
            .replace('YYYY', String(year))
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }
}
exports.DateFormatter = DateFormatter;
