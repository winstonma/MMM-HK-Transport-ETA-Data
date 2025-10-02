const { ValidationError, ConfigurationError } = require('./errors');

/**
 * Configuration validator
 */
class ConfigValidator {
    /**
     * Validate a number value
     * @param {*} value - Value to validate
     * @param {string} name - Config name for error messages
     * @param {Object} options - Validation options
     * @returns {number} Validated number
     */
    static validateNumber(value, name, options = {}) {
        const { min, max, defaultValue } = options;

        if (value === undefined || value === null) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            throw new ConfigurationError(`${name} is required`, { name });
        }

        const num = typeof value === 'string' ? parseInt(value, 10) : value;

        if (isNaN(num)) {
            throw new ConfigurationError(`${name} must be a valid number`, {
                name,
                value,
            });
        }

        if (min !== undefined && num < min) {
            throw new ConfigurationError(
                `${name} must be at least ${min}`,
                { name, value: num, min }
            );
        }

        if (max !== undefined && num > max) {
            throw new ConfigurationError(
                `${name} must be at most ${max}`,
                { name, value: num, max }
            );
        }

        return num;
    }

    /**
     * Validate a string value
     * @param {*} value - Value to validate
     * @param {string} name - Config name for error messages
     * @param {Object} options - Validation options
     * @returns {string} Validated string
     */
    static validateString(value, name, options = {}) {
        const { pattern, defaultValue, allowEmpty = true } = options;

        if (value === undefined || value === null) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            throw new ConfigurationError(`${name} is required`, { name });
        }

        const str = String(value);

        if (!allowEmpty && str.trim() === '') {
            throw new ConfigurationError(`${name} cannot be empty`, {
                name,
            });
        }

        if (pattern && !pattern.test(str)) {
            throw new ConfigurationError(
                `${name} does not match required pattern`,
                { name, value: str, pattern: pattern.toString() }
            );
        }

        return str;
    }

    /**
     * Validate a boolean value
     * @param {*} value - Value to validate
     * @param {string} name - Config name for error messages
     * @param {Object} options - Validation options
     * @returns {boolean} Validated boolean
     */
    static validateBoolean(value, name, options = {}) {
        const { defaultValue } = options;

        if (value === undefined || value === null) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            throw new ConfigurationError(`${name} is required`, { name });
        }

        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'string') {
            const lower = value.toLowerCase();
            if (lower === 'true' || lower === '1' || lower === 'yes') {
                return true;
            }
            if (lower === 'false' || lower === '0' || lower === 'no') {
                return false;
            }
        }

        throw new ConfigurationError(`${name} must be a boolean value`, {
            name,
            value,
        });
    }

    /**
     * Validate a URL
     * @param {*} value - Value to validate
     * @param {string} name - Config name for error messages
     * @param {Object} options - Validation options
     * @returns {string} Validated URL
     */
    static validateUrl(value, name, options = {}) {
        const { defaultValue } = options;

        if (value === undefined || value === null) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            throw new ConfigurationError(`${name} is required`, { name });
        }

        const str = String(value);

        try {
            new URL(str);
            return str;
        } catch (error) {
            throw new ConfigurationError(`${name} must be a valid URL`, {
                name,
                value: str,
            });
        }
    }

    /**
     * Validate an object has required keys
     * @param {Object} obj - Object to validate
     * @param {Array<string>} requiredKeys - Required keys
     * @param {string} name - Config name for error messages
     */
    static validateRequiredKeys(obj, requiredKeys, name) {
        if (!obj || typeof obj !== 'object') {
            throw new ConfigurationError(`${name} must be an object`, {
                name,
            });
        }

        const missing = requiredKeys.filter(key => !(key in obj));
        if (missing.length > 0) {
            throw new ConfigurationError(
                `${name} is missing required keys: ${missing.join(', ')}`,
                { name, missing }
            );
        }
    }
}

module.exports = { ConfigValidator };
