/**
 * Error Handling Utilities
 * Centralized error message extraction and formatting
 */

export interface ApiError {
  response?: {
    data?: {
      detail?: string | ApiErrorDetail
      errors?: Array<ValidationError>
    }
    status: number
    statusText: string
  }
  message?: string
  code?: string
}

interface ApiErrorDetail {
  msg: string
  loc?: string[]
}

interface ValidationError {
  msg: string
  loc: string[]
  type: string
}

/**
 * Extract a user-friendly error message from an API error
 *
 * @param error - The error object from axios or fetch
 * @param defaultMessage - Default message if extraction fails
 * @returns User-friendly error message
 */
export function extractErrorMessage(error: any, defaultMessage: string): string {
  // Handle null/undefined
  if (!error) {
    return defaultMessage
  }

  // If error is a string, return it
  if (typeof error === 'string') {
    return error
  }

  // Check for response.data.detail (FastAPI HTTPException)
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail

    // Detail can be a string or object
    if (typeof detail === 'string') {
      return detail
    }

    // Detail is an object with msg
    if (detail.msg) {
      return detail.msg
    }
  }

  // Check for validation errors (Pydantic)
  if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
    const errors = error.response.data.errors

    if (errors.length > 0) {
      const firstError = errors[0]
      const field = firstError.loc?.[firstError.loc.length - 1] || 'veld'
      return `Validatie fout bij ${field}: ${firstError.msg}`
    }
  }

  // Check for standard error message
  if (error.message) {
    return error.message
  }

  // Check for response status text
  if (error.response?.statusText) {
    return error.response.statusText
  }

  // Fallback to default message
  return defaultMessage
}

/**
 * Format validation errors for display
 *
 * @param errors - Array of validation errors from Pydantic
 * @returns Formatted error messages
 */
export function formatValidationErrors(errors: ValidationError[]): string[] {
  return errors.map((error) => {
    const field = error.loc[error.loc.length - 1]
    return `${field}: ${error.msg}`
  })
}

/**
 * Check if an error is a specific HTTP status code
 *
 * @param error - The error object
 * @param statusCode - HTTP status code to check
 * @returns True if error matches the status code
 */
export function isErrorStatus(error: any, statusCode: number): boolean {
  return error?.response?.status === statusCode
}

/**
 * Check if error is a network error (no response)
 *
 * @param error - The error object
 * @returns True if it's a network error
 */
export function isNetworkError(error: any): boolean {
  return !error?.response && error?.message
}

/**
 * Check if error is an authorization error (401 or 403)
 *
 * @param error - The error object
 * @returns True if it's an auth error
 */
export function isAuthError(error: any): boolean {
  return isErrorStatus(error, 401) || isErrorStatus(error, 403)
}

/**
 * Check if error is a validation error (422)
 *
 * @param error - The error object
 * @returns True if it's a validation error
 */
export function isValidationError(error: any): boolean {
  return isErrorStatus(error, 422)
}

/**
 * Get a user-friendly status code description
 *
 * @param statusCode - HTTP status code
 * @returns User-friendly description
 */
export function getStatusCodeDescription(statusCode: number): string {
  const descriptions: Record<number, string> = {
    400: 'Ongeldige aanvraag',
    401: 'Niet geautoriseerd - log opnieuw in',
    403: 'Geen toegang tot deze functie',
    404: 'Niet gevonden',
    409: 'Conflict - item bestaat al',
    422: 'Validatie fout',
    429: 'Te veel verzoeken - probeer later opnieuw',
    500: 'Server fout',
    503: 'Service tijdelijk niet beschikbaar',
  }

  return descriptions[statusCode] || `HTTP fout ${statusCode}`
}

/**
 * Create a user-friendly error object for logging
 *
 * @param error - The error object
 * @returns Sanitized error object for logging
 */
export function sanitizeErrorForLogging(error: any): object {
  return {
    message: extractErrorMessage(error, 'Unknown error'),
    status: error?.response?.status,
    statusText: error?.response?.statusText,
    url: error?.config?.url,
    method: error?.config?.method,
    timestamp: new Date().toISOString(),
  }
}
