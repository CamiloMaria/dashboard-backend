/**
 * JSON utility functions for data manipulation
 */

/**
 * Try to parse a JSON string, return default value if parsing fails
 * @param jsonString JSON string to parse
 * @param defaultValue Default value to return if parsing fails
 * @returns Parsed JSON object or default value
 */
export function tryParseJson<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    return defaultValue;
  }
}
