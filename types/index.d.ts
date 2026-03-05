/**
 * Type definitions for Coding Plans Dashboard
 */

/**
 * Provider ID constants
 */
export type ProviderId =
  | "zhipu-ai"
  | "kimi-ai"
  | "volcengine-ai"
  | "minimax-ai"
  | "aliyun-ai"
  | "baidu-qianfan-ai"
  | "kwaikat-ai"
  | "x-aio"
  | "compshare-ai"
  | "infini-ai"
  | "mthreads-ai"
  | "zenmux-ai";

/**
 * Plan object representing a pricing plan
 */
export interface Plan {
  /** Plan name */
  name: string;
  /** Current price amount */
  currentPrice: number | null;
  /** Current price display text */
  currentPriceText: string | null;
  /** Original price amount (if discounted) */
  originalPrice: number | null;
  /** Original price display text */
  originalPriceText: string | null;
  /** Time unit (e.g., "月" for month) */
  unit: string | null;
  /** Additional notes or promotions */
  notes: string | null;
  /** Service details/features */
  serviceDetails: string[] | null;
}

/**
 * Provider data structure
 */
export interface ProviderData {
  /** Provider ID */
  provider: ProviderId;
  /** Source URLs */
  sourceUrls: string[];
  /** ISO timestamp of when data was fetched */
  fetchedAt: string;
  /** Array of pricing plans */
  plans: Plan[];
  /** Whether this is fallback data */
  isFallback?: boolean;
}

/**
 * Complete pricing data output structure
 */
export interface PricingData {
  /** Schema version */
  schemaVersion: number;
  /** ISO timestamp of when data was generated */
  generatedAt: string;
  /** Array of provider data */
  providers: ProviderData[];
  /** Array of failure messages */
  failures: string[];
}

/**
 * Price parsing result
 */
export interface ParsedPrice {
  /** Numeric amount */
  amount: number | null;
  /** Normalized text */
  text: string | null;
  /** Time unit */
  unit: string | null;
}

/**
 * Request context for async operations
 */
export interface RequestContext {
  /** Timeout in milliseconds */
  timeoutMs: number;
  /** Abort signal */
  signal: AbortSignal;
}

/**
 * Fetch options
 */
export interface FetchOptions {
  /** Timeout override */
  timeoutMs?: number;
  /** Abort signal */
  signal?: AbortSignal;
  /** Number of retries */
  retries?: number;
  /** Delay between retries */
  retryDelayMs?: number;
  /** Additional fetch options */
  [key: string]: unknown;
}

/**
 * Plan creation parameters
 */
export interface PlanParams {
  /** Plan name */
  name: string;
  /** Current price text */
  currentPriceText: string;
  /** Current price amount */
  currentPrice?: number | null;
  /** Original price text */
  originalPriceText?: string | null;
  /** Original price amount */
  originalPrice?: number | null;
  /** Time unit */
  unit?: string | null;
  /** Additional notes */
  notes?: string | null;
  /** Service details */
  serviceDetails?: string[] | null;
}

/**
 * Error context object
 */
export interface ErrorContext {
  /** Original error */
  originalError?: Error;
  /** Operation name */
  operation?: string;
  /** URL related to error */
  url?: string;
  /** Validation errors */
  errors?: string[];
  /** Additional context */
  [key: string]: unknown;
}

/**
 * Provider error class
 */
export class ProviderError extends Error {
  /** Provider ID */
  provider: string;
  /** Error context */
  context: ErrorContext;
  /** ISO timestamp */
  timestamp: string;

  constructor(message: string, provider: string, context?: ErrorContext);
}

/**
 * Fetch error class
 */
export class FetchError extends ProviderError {
  /** URL that failed */
  url: string;

  constructor(message: string, provider: string, url: string, context?: ErrorContext);
}

/**
 * Parse error class
 */
export class ParseError extends ProviderError {
  constructor(message: string, provider: string, context?: ErrorContext);
}

/**
 * Validation error class
 */
export class ValidationError extends ProviderError {
  /** Validation error messages */
  errors: string[];

  constructor(message: string, provider: string, errors?: string[]);
}

// Utility functions

/**
 * Decodes HTML entities in a string
 */
export function decodeHtml(value: string): string;

/**
 * Removes HTML tags from a string
 */
export function stripTags(value: string): string;

/**
 * Normalizes text by decoding HTML entities and whitespace
 */
export function normalizeText(value: string): string;

/**
 * Decodes unicode escape sequences
 */
export function decodeUnicodeLiteral(value: string): string;

/**
 * Checks if text appears to contain price information
 */
export function isPriceLike(text: string): boolean;

/**
 * Parses price text to extract amount, text, and unit
 */
export function parsePriceText(text: string): ParsedPrice;

/**
 * Compacts inline text by normalizing whitespace
 */
export function compactInlineText(value: string): string;

/**
 * Detects currency type from text
 */
export function detectCurrencyFromText(text: string, fallback?: string): string;

/**
 * Normalizes money text based on detected currency
 */
export function normalizeMoneyTextByCurrency(rawValue: string, fallbackCurrency?: string): string | null;

/**
 * Normalizes currency symbols in a plan object
 */
export function normalizePlanCurrencySymbols(plan: Plan): Plan;

/**
 * Normalizes currency symbols for all providers
 */
export function normalizeProviderCurrencySymbols(providers: ProviderData[]): ProviderData[];

/**
 * Removes duplicate plans
 */
export function dedupePlans(plans: Plan[]): Plan[];

/**
 * Fetches text content from a URL with retry logic
 */
export function fetchText(url: string, options?: FetchOptions): Promise<string>;

/**
 * Fetches and parses JSON from a URL
 */
export function fetchJson(url: string, options?: FetchOptions): Promise<unknown>;

/**
 * Extracts table rows from HTML
 */
export function extractRows(html: string): string[][];

/**
 * Formats a numeric amount as a string
 */
export function formatAmount(amount: number): string | null;

/**
 * Normalizes service details from various input formats
 */
export function normalizeServiceDetails(values: string | string[] | null | undefined): string[] | null;

/**
 * Builds service details from table rows
 */
export function buildServiceDetailsFromRows(
  rows: string[][],
  column: number,
  options?: { excludeLabels?: string[] },
): string[] | null;

/**
 * Creates a standardized plan object
 */
export function asPlan(params: PlanParams): Plan;

/**
 * Converts a relative URL to absolute URL
 */
export function absoluteUrl(url: string, baseUrl: string): string;

/**
 * Returns unique values from an array
 */
export function unique<T>(values: T[]): T[];

/**
 * Converts time unit constant to label
 */
export function timeUnitLabel(value: string): string | null;

/**
 * Checks if a unit represents a monthly period
 */
export function isMonthlyUnit(value: string): boolean;

/**
 * Checks if price text represents a monthly price
 */
export function isMonthlyPriceText(value: string): boolean;

/**
 * Checks if a plan is a standard monthly/quarterly plan
 */
export function isStandardMonthlyPlan(plan: Plan): boolean;

/**
 * Filters and deduplicates standard monthly plans
 */
export function keepStandardMonthlyPlans(plans: Plan[]): Plan[];

/**
 * Strips simple markdown formatting from text
 */
export function stripSimpleMarkdown(text: string): string;

/**
 * Safely executes an async function with error handling
 */
export function safeExecute<T>(
  fn: () => Promise<T>,
  options: {
    provider: string;
    operation?: string;
    onError?: (error: ProviderError) => void;
  },
): Promise<T | null>;

/**
 * Retries an async operation with exponential backoff
 */
export function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    baseDelayMs?: number;
    shouldRetry?: (error: Error) => boolean;
  },
): Promise<T>;

/**
 * Validates that required fields exist in an object
 */
export function validateRequired(obj: object, requiredFields: string[], context?: string): void;

/**
 * Creates a fallback response for a provider
 */
export function createFallbackResponse(
  provider: string,
  plans?: Plan[],
  sourceUrls?: string[],
): ProviderData;

/**
 * Formats an error for logging
 */
export function formatError(error: Error): string;

// Constants

/** HTML entity mappings */
export const HTML_ENTITIES: Record<string, string>;

/** CNY currency hint regex */
export const CNY_CURRENCY_HINT: RegExp;

/** USD currency hint regex */
export const USD_CURRENCY_HINT: RegExp;

/** Common HTTP headers */
export const COMMON_HEADERS: Record<string, string>;

/** Request context AsyncLocalStorage */
export const REQUEST_CONTEXT: import("async_hooks").AsyncLocalStorage<RequestContext>;

/** Default request timeout in milliseconds */
export const REQUEST_TIMEOUT_MS: number;

/** Provider ID constants */
export const PROVIDER_IDS: Record<string, ProviderId>;
