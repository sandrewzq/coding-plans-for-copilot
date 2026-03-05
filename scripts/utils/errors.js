"use strict";

/**
 * @fileoverview Error handling utilities for provider pricing data fetching.
 * Provides standardized error types and error handling patterns.
 */

/**
 * Base error class for provider-related errors
 * @extends Error
 */
class ProviderError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} provider - Provider ID
   * @param {Object} [context={}] - Additional context
   */
  constructor(message, provider, context = {}) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Error for fetch-related failures
 * @extends ProviderError
 */
class FetchError extends ProviderError {
  /**
   * @param {string} message - Error message
   * @param {string} provider - Provider ID
   * @param {string} url - URL that failed
   * @param {Object} [context={}] - Additional context
   */
  constructor(message, provider, url, context = {}) {
    super(message, provider, { ...context, url });
    this.name = "FetchError";
    this.url = url;
  }
}

/**
 * Error for parsing-related failures
 * @extends ProviderError
 */
class ParseError extends ProviderError {
  /**
   * @param {string} message - Error message
   * @param {string} provider - Provider ID
   * @param {Object} [context={}] - Additional context
   */
  constructor(message, provider, context = {}) {
    super(message, provider, context);
    this.name = "ParseError";
  }
}

/**
 * Error for validation-related failures
 * @extends ProviderError
 */
class ValidationError extends ProviderError {
  /**
   * @param {string} message - Error message
   * @param {string} provider - Provider ID
   * @param {string[]} errors - Validation error messages
   */
  constructor(message, provider, errors = []) {
    super(message, provider, { errors });
    this.name = "ValidationError";
    this.errors = errors;
  }
}

/**
 * Safely executes an async function with error handling
 * @template T
 * @param {() => Promise<T>} fn - Function to execute
 * @param {Object} options - Options
 * @param {string} options.provider - Provider ID for error context
 * @param {string} [options.operation="operation"] - Operation name
 * @param {Function} [options.onError] - Error handler callback
 * @returns {Promise<T|null>} Result or null on error
 */
async function safeExecute(fn, { provider, operation = "operation", onError } = {}) {
  try {
    return await fn();
  } catch (error) {
    const wrappedError = new ProviderError(
      error.message || `Failed during ${operation}`,
      provider,
      { originalError: error, operation },
    );
    if (onError) {
      onError(wrappedError);
    } else {
      console.warn(`[${provider}] ${operation} failed: ${error.message}`);
    }
    return null;
  }
}

/**
 * Retries an async operation with exponential backoff
 * @template T
 * @param {() => Promise<T>} fn - Function to retry
 * @param {Object} [options={}] - Retry options
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.baseDelayMs=1000] - Base delay between retries
 * @param {Function} [options.shouldRetry] - Function to determine if error is retryable
 * @returns {Promise<T>} Result of the function
 * @throws {Error} Last error if all retries fail
 */
async function withRetry(fn, { maxRetries = 3, baseDelayMs = 1000, shouldRetry } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      if (shouldRetry && !shouldRetry(error)) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Validates that required fields exist in an object
 * @param {Object} obj - Object to validate
 * @param {string[]} requiredFields - Required field names
 * @param {string} [context=""] - Context for error message
 * @throws {ValidationError} If validation fails
 */
function validateRequired(obj, requiredFields, context = "") {
  const missing = requiredFields.filter((field) => {
    const value = obj?.[field];
    return value === undefined || value === null || value === "";
  });

  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(", ")}`,
      context,
      missing.map((field) => `Field "${field}" is required`),
    );
  }
}

/**
 * Creates a fallback response for a provider
 * @param {string} provider - Provider ID
 * @param {Object[]} [plans=[]] - Fallback plans
 * @param {string[]} [sourceUrls=[]] - Source URLs
 * @returns {Object} Standardized fallback response
 */
function createFallbackResponse(provider, plans = [], sourceUrls = []) {
  return {
    provider,
    sourceUrls,
    fetchedAt: new Date().toISOString(),
    plans,
    isFallback: true,
  };
}

/**
 * Formats an error for logging
 * @param {Error} error - Error to format
 * @returns {string} Formatted error string
 */
function formatError(error) {
  if (error instanceof ProviderError) {
    return `[${error.provider}] ${error.name}: ${error.message}`;
  }
  return `${error.name}: ${error.message}`;
}

module.exports = {
  ProviderError,
  FetchError,
  ParseError,
  ValidationError,
  safeExecute,
  withRetry,
  validateRequired,
  createFallbackResponse,
  formatError,
};
