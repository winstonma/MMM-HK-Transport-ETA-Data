/**
 * Result class for consistent success/failure responses
 * Inspired by Rust's Result type
 */

class Result {
  constructor(success, data, error) {
    this._success = success;
    this._data = data;
    this._error = error;
  }

  /**
   * Create a successful result
   * @param {*} data - The success data
   * @returns {Result} Success result
   */
  static success(data) {
    return new Result(true, data, null);
  }

  /**
   * Create a failure result
   * @param {Error|string} error - The error
   * @param {Object} details - Additional error details
   * @returns {Result} Failure result
   */
  static failure(error, details = {}) {
    const errorObj =
      error instanceof Error
        ? error
        : new Error(typeof error === 'string' ? error : 'Unknown error');

    // Add details to error if it's a custom error
    if (errorObj.details && typeof errorObj.details === 'object') {
      Object.assign(errorObj.details, details);
    }

    return new Result(false, null, errorObj);
  }

  /**
   * Check if result is successful
   * @returns {boolean}
   */
  isSuccess() {
    return this._success;
  }

  /**
   * Check if result is a failure
   * @returns {boolean}
   */
  isFailure() {
    return !this._success;
  }

  /**
   * Get the data (throws if failure)
   * @returns {*} The success data
   * @throws {Error} If result is a failure
   */
  unwrap() {
    if (this._success) {
      return this._data;
    }
    throw this._error;
  }

  /**
   * Get the data or a default value
   * @param {*} defaultValue - Default value if failure
   * @returns {*} The success data or default value
   */
  unwrapOr(defaultValue) {
    return this._success ? this._data : defaultValue;
  }

  /**
   * Get the error (returns null if success)
   * @returns {Error|null}
   */
  getError() {
    return this._error;
  }

  /**
   * Map the success value to a new value
   * @param {Function} fn - Mapping function
   * @returns {Result} New result with mapped value
   */
  map(fn) {
    if (this._success) {
      try {
        return Result.success(fn(this._data));
      } catch (error) {
        return Result.failure(error);
      }
    }
    return this;
  }

  /**
   * Map the error to a new error
   * @param {Function} fn - Mapping function
   * @returns {Result} New result with mapped error
   */
  mapError(fn) {
    if (!this._success) {
      return Result.failure(fn(this._error));
    }
    return this;
  }

  /**
   * Convert to a plain object
   * @returns {Object}
   */
  toObject() {
    return {
      success: this._success,
      data: this._data,
      error: this._error
        ? {
            message: this._error.message,
            code: this._error.code,
            details: this._error.details,
            name: this._error.name,
          }
        : null,
    };
  }

  /**
   * Convert to JSON
   * @returns {Object}
   */
  toJSON() {
    return this.toObject();
  }
}

module.exports = { Result };
