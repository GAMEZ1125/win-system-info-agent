"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateFormatter = void 0;
/**
 * Utilidad para formatear fechas en zona horaria de Colombia (GMT-5)
 */
class DateFormatter {
    /**
     * Crea una fecha en zona horaria de Colombia (GMT-5)
     * @returns Fecha en zona horaria de Colombia
     */
    static getColombiaDate() {
        // Obtener fecha y hora actual en UTC
        const now = new Date();
        // Obtener offset UTC en minutos
        const utcOffset = now.getTimezoneOffset();
        // Calcular el offset Colombia (GMT-5 = -300 minutos)
        const colombiaOffset = -300;
        // Ajustar la fecha según la diferencia entre la zona local y Colombia
        // Solo si el sistema no está ya en la zona horaria Colombia
        if (utcOffset !== colombiaOffset) {
            // Calcular la diferencia en milisegundos
            const offsetDiff = (utcOffset - colombiaOffset) * 60 * 1000;
            return new Date(now.getTime() + offsetDiff);
        }
        // Si ya estamos en GMT-5, devolver la fecha actual
        return now;
    }
    /**
     * Formatea una fecha para la zona horaria de Colombia (GMT-5)
     * @param date Fecha a formatear
     * @param format Formato opcional (por defecto: 'YYYY-MM-DD HH:mm:ss')
     * @returns Fecha formateada como string
     */
    static formatToColombiaTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
        // Crear un objeto Date
        const dateObj = typeof date === 'object' ? date : new Date(date);
        // Obtener offset UTC en minutos
        const utcOffset = dateObj.getTimezoneOffset();
        // Calcular el offset Colombia (GMT-5 = -300 minutos)
        const colombiaOffset = -300;
        // Ajustar la fecha según la diferencia entre la zona local y Colombia
        let colombiaTime;
        if (utcOffset !== colombiaOffset) {
            // Calcular la diferencia en milisegundos
            const offsetDiff = (utcOffset - colombiaOffset) * 60 * 1000;
            colombiaTime = new Date(dateObj.getTime() + offsetDiff);
        }
        else {
            colombiaTime = dateObj;
        }
        // Extraer componentes de la fecha
        const year = colombiaTime.getFullYear();
        const month = String(colombiaTime.getMonth() + 1).padStart(2, '0');
        const day = String(colombiaTime.getDate()).padStart(2, '0');
        const hours = String(colombiaTime.getHours()).padStart(2, '0');
        const minutes = String(colombiaTime.getMinutes()).padStart(2, '0');
        const seconds = String(colombiaTime.getSeconds()).padStart(2, '0');
        // Reemplazar tokens en el formato
        return format
            .replace('YYYY', String(year))
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }
    /**
     * Devuelve el offset SQL para la zona horaria de Colombia
     * @returns string con el formato '+/-HH:MM'
     */
    static getColombiaTimeZoneOffset() {
        return '-05:00';
    }
}
exports.DateFormatter = DateFormatter;
