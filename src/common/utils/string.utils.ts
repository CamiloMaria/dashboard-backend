/**
 * String utility functions for data sanitization and manipulation
 */

/**
 * Sanitizes a string by trimming whitespace and removing control characters
 * @param value String to sanitize
 * @returns Cleaned string or empty string if input is null/undefined
 */
export function sanitizeString(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Trim whitespace (including tabs, newlines, etc.) and remove control characters
  return value.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, '');
}

/**
 * Trims a string if it exists, otherwise returns null
 * @param value String to trim
 * @returns Trimmed string or null if input is null/undefined
 */
export function trimOrNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = sanitizeString(value);
  return trimmed === '' ? null : trimmed;
}

/**
 * Converts an object to a query string
 * @param obj Object to convert
 * @returns Query string
 */
export function getQueryStringParameters(obj: any) {
  return Object.keys(obj)
    .map((key) => key + '=' + obj[key])
    .join('&');
}
