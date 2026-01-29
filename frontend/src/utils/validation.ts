/**
 * Frontend Validation Utilities
 * Protects against URL injection and sanitizes error messages
 */

/**
 * Validate URL is safe (http/https only)
 */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize error message for user display
 */
export function sanitizeErrorMessage(error: any): string {
  const safeErrors = [
    'Request not found',
    'Invalid request',
    'Maximum attempts reached',
    'Authentication required',
    'Too many requests',
    'Request is not awaiting clarification',
    'Clarification response required',
    'Maximum clarification attempts reached'
  ];

  const message = error?.response?.data?.error || error?.message || error?.toString() || '';

  // Check if message is in safe list
  if (safeErrors.some(safe => message.includes(safe))) {
    return message;
  }

  // Generic error for everything else
  return 'An error occurred. Please try again.';
}
