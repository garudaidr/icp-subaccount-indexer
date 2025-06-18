/**
 * Utility functions for test integration
 */

/**
 * Custom JSON.stringify replacer that handles BigInt values
 * @param key - The property name
 * @param value - The property value
 * @returns The value to serialize, converting BigInt to string
 */
function bigIntReplacer(key: string, value: any): any {
  if (typeof value === 'bigint') {
    return value.toString() + 'n';
  }
  return value;
}

/**
 * Safe JSON.stringify that handles BigInt values
 * @param obj - The object to stringify
 * @param space - The space parameter for formatting
 * @returns JSON string with BigInt values converted to strings
 */
export function safeJsonStringify(obj: any, space?: string | number): string {
  return JSON.stringify(obj, bigIntReplacer, space);
}

/**
 * Formats a result value for console output, handling BigInt serialization
 * @param result - The result value to format
 * @returns Formatted string representation
 */
export function formatResult(result: any): string {
  if (typeof result === 'bigint') {
    return result.toString() + 'n';
  }

  if (typeof result === 'object' && result !== null) {
    return safeJsonStringify(result, 2);
  }

  return String(result);
}
