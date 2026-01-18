/**
 * Utility functions for consistent timezone handling across the application
 * All timestamps use America/Santiago (Chile Time: UTC-3)
 */

import moment, { Moment } from 'moment-timezone';

// Default timezone for the application
export const APP_TIMEZONE = 'America/Santiago';

/**
 * Creates a current timestamp in the application's timezone (Chile Time)
 * Returns a Date constructed from Chile local time (without timezone conversion)
 * This ensures MySQL stores the exact local time without UTC conversion
 * 
 * @returns A Date object representing the current time in Chile timezone
 */
export function getChileNow(): Date {
  const chileTime = moment.tz(APP_TIMEZONE);
  // Create Date from formatted string without timezone - preserves the local time
  return new Date(chileTime.format('YYYY-MM-DD HH:mm:ss'));
}

/**
 * Converts a Date or string to a moment object in Chile timezone
 * 
 * @param date - Date object or ISO string to convert
 * @returns moment object in Chile timezone
 */
export function toChileTime(date: Date | string | Moment): Moment {
  if (moment.isMoment(date)) {
    return date.clone().tz(APP_TIMEZONE);
  }
  return moment.tz(date, APP_TIMEZONE);
}

/**
 * Formats a date for display in DD-MM-YYYY HH:mm format
 * Ensures consistent display across all components
 * 
 * @param date - Date object or ISO string to format
 * @returns Formatted string in DD-MM-YYYY HH:mm format
 */
export function formatAuditDate(date: Date | string | Moment): string {
  return toChileTime(date).format('DD-MM-YYYY HH:mm');
}

/**
 * General purpose date-time formatter for UI surfaces
 * Mirrors the audit format to enforce DD-MM-YYYY HH:mm everywhere
 */
export function formatDateTime(date: Date | string | Moment): string {
  return formatAuditDate(date);
}

/**
 * Formats a date with full time details for detailed audit views
 * Format: DD-MM-YYYY HH:mm:ss
 * 
 * @param date - Date object or ISO string to format
 * @returns Formatted string in DD-MM-YYYY HH:mm:ss format
 */
export function formatAuditDateWithSeconds(date: Date | string | Moment): string {
  return toChileTime(date).format('DD-MM-YYYY HH:mm:ss');
}

/**
 * Formats a date in Spanish locale format using Chile timezone
 * Format: DD [de] MMMM [de] YYYY [a las] HH:mm
 * 
 * @param date - Date object or ISO string to format
 * @returns Formatted string in Spanish
 */
export function formatAuditDateSpanish(date: Date | string | Moment): string {
  return toChileTime(date).locale('es').format('DD [de] MMMM [de] YYYY [a las] HH:mm');
}

/**
 * Formats a date using es-ES locale (Spanish from Spain, but can work for Chile)
 * This is useful for toLocaleString compatibility
 * 
 * @param date - Date object or ISO string to format
 * @returns Formatted string using es-ES locale
 */
export function formatAuditDateLocaleES(date: Date | string | Moment): string {
  const d = typeof date === 'string' ? new Date(date) : moment.isMoment(date) ? date.toDate() : date;
  // First convert to Chile timezone, then format with locale
  const chileTime = toChileTime(d);
  return chileTime.format('DD/MM/YYYY HH:mm');
}

/**
 * Gets the current timestamp as ISO string in Chile timezone
 * Useful for storing timestamps consistently
 * 
 * @returns ISO string of current time in Chile timezone
 */
export function getChileNowISO(): string {
  return getChileNow().toISOString();
}

/**
 * Gets the UTC offset for Chile timezone
 * Chile is UTC-3 (UTC-4 during daylight saving if applicable)
 * 
 * @returns UTC offset string (e.g., "-03:00")
 */
export function getChileTimezoneOffset(): string {
  return moment.tz(APP_TIMEZONE).format('Z');
}
