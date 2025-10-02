/**
 * Custom error types for better error handling
 */

/**
 * @typedef {Object} ErrorDetails
 * @property {string} [url] - URL related to the error
 * @property {number} [statusCode] - HTTP status code
 * @property {string} [originalError] - Original error message
 * @property {string} [stopId] - Stop ID related to the error
 * @property {string} [route] - Route related to the error
 * @property {*} [value] - Invalid value that caused the error
 */

/**
 * Base error class for all custom errors
 * @class
 * @extends Error
 */
class BaseError extends Error {
  /**
   * Create a new base error
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {ErrorDetails} [details={}] - Additional error details
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Network-related errors (API calls, timeouts, etc.)
 * @class
 * @extends BaseError
 */
class NetworkError extends BaseError {
  /**
   * Create a new network error
   * @param {string} message - Error message
   * @param {ErrorDetails} [details={}] - Additional error details
   */
  constructor(message, details = {}) {
    super(message, 'NETWORK_ERROR', details);
  }
}

/**
 * Validation errors (invalid data, missing fields, etc.)
 * @class
 * @extends BaseError
 */
class ValidationError extends BaseError {
  /**
   * Create a new validation error
   * @param {string} message - Error message
   * @param {ErrorDetails} [details={}] - Additional error details
   */
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

/**
 * File system errors (read/write failures, etc.)
 * @class
 * @extends BaseError
 */
class FileSystemError extends BaseError {
  /**
   * Create a new file system error
   * @param {string} message - Error message
   * @param {ErrorDetails} [details={}] - Additional error details
   */
  constructor(message, details = {}) {
    super(message, 'FILESYSTEM_ERROR', details);
  }
}

/**
 * Configuration errors (missing config, invalid values, etc.)
 * @class
 * @extends BaseError
 */
class ConfigurationError extends BaseError {
  /**
   * Create a new configuration error
   * @param {string} message - Error message
   * @param {ErrorDetails} [details={}] - Additional error details
   */
  constructor(message, details = {}) {
    super(message, 'CONFIGURATION_ERROR', details);
  }
}

/**
 * Data processing errors (transformation failures, etc.)
 * @class
 * @extends BaseError
 */
class ProcessingError extends BaseError {
  /**
   * Create a new processing error
   * @param {string} message - Error message
   * @param {ErrorDetails} [details={}] - Additional error details
   */
  constructor(message, details = {}) {
    super(message, 'PROCESSING_ERROR', details);
  }
}

module.exports = {
  BaseError,
  NetworkError,
  ValidationError,
  FileSystemError,
  ConfigurationError,
  ProcessingError,
};
