/**
 * Custom error types for better error handling
 */

/**
 * Base error class for all custom errors
 */
class BaseError extends Error {
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
 */
class NetworkError extends BaseError {
  constructor(message, details = {}) {
    super(message, 'NETWORK_ERROR', details);
  }
}

/**
 * Validation errors (invalid data, missing fields, etc.)
 */
class ValidationError extends BaseError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

/**
 * File system errors (read/write failures, etc.)
 */
class FileSystemError extends BaseError {
  constructor(message, details = {}) {
    super(message, 'FILESYSTEM_ERROR', details);
  }
}

/**
 * Configuration errors (missing config, invalid values, etc.)
 */
class ConfigurationError extends BaseError {
  constructor(message, details = {}) {
    super(message, 'CONFIGURATION_ERROR', details);
  }
}

/**
 * Data processing errors (transformation failures, etc.)
 */
class ProcessingError extends BaseError {
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
