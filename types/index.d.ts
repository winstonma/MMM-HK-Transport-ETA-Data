/**
 * Type definitions for HK Transport ETA Data Collector
 */

// Base API Client
export interface ApiClientConfig {
    timeout?: number;
    cacheDir?: string;
    cacheTtl?: number;
    headers?: Record<string, string>;
    hooks?: any;
}

export class BaseApiClient {
    constructor(requestsPerSecond?: number, concurrentRequests?: number, config?: ApiClientConfig);
    fetchJson(url: string): Promise<any>;
    fetchJsonSafe(url: string): Promise<Result<any>>;
    processWithConcurrency<T>(items: T[], processor: (item: T) => Promise<any>): Promise<PromiseSettledResult<any>[]>;
}

// Data Collector
export interface StopDetailsResult {
    stopId: string;
    data: any | null;
    error: boolean;
    fromCache?: boolean;
}

export class BaseDataCollector {
    constructor(apiClient: BaseApiClient, concurrentRequests?: number);
    collectAllStopDetails(stopIds: string[]): Promise<PromiseSettledResult<StopDetailsResult>[]>;
    collectStopDetails(stopId: string): Promise<StopDetailsResult>;
    compareRoutes(existingRoutes: string[] | null, newRoutes: string[] | null): boolean;
}

// Data Processor
export interface EnrichedStopData {
    stop: string;
    name_en: string;
    name_tc: string;
    name_sc: string;
    lat: string;
    long: string;
    routes: string[];
    data_timestamp: string;
}

export interface EnrichedRouteData {
    route: string;
    stops: any[];
}

export class BaseDataProcessor {
    static processStopDetailsResults(stopDetailsResults: PromiseSettledResult<any>[]): Array<{stopId: string, data: any}>;
    static enrichStopWithRoutes(stopData: any, stopRoutesMap: Record<string, string[] | Set<string>>, stopId: string): EnrichedStopData;
    static createEnrichedRouteData(route: string, routeStops: Record<string, {inbound: any[], outbound: any[]}>, successfulStops: Array<{stopId: string, data: any}>): EnrichedRouteData;
}

// File Manager
export interface SaveResult {
    filePath: string;
    stopId?: string;
    route?: string;
    count?: number;
}

export class BaseFileManager {
    constructor(baseDir?: string);
    ensureDirectories(): Promise<void>;
    saveStopData(stopId: string, stopData: EnrichedStopData): Promise<Result<SaveResult>>;
    saveRouteData(route: string, routeData: EnrichedRouteData): Promise<Result<SaveResult>>;
    saveAllStops(allStopsData: Record<string, EnrichedStopData>): Promise<Result<SaveResult>>;
    saveAllRoutes(allRoutesData: Record<string, EnrichedRouteData>): Promise<boolean>;
}

// Result
export class Result<T> {
    static success<T>(data: T): Result<T>;
    static failure<T>(error: Error | string, details?: any): Result<T>;
    isSuccess(): boolean;
    isFailure(): boolean;
    unwrap(): T;
    unwrapOr<D>(defaultValue: D): T | D;
    getError(): Error | null;
    map<U>(fn: (data: T) => U): Result<U>;
    mapError(fn: (error: Error) => Error): Result<T>;
    toObject(): { success: boolean; data: T | null; error: any | null };
    toJSON(): { success: boolean; data: T | null; error: any | null };
}

// Errors
export interface ErrorDetails {
    url?: string;
    statusCode?: number;
    originalError?: string;
    stopId?: string;
    route?: string;
    value?: any;
}

export class BaseError extends Error {
    code: string;
    details: ErrorDetails;
    timestamp: string;
    constructor(message: string, code: string, details?: ErrorDetails);
    toJSON(): any;
}

export class NetworkError extends BaseError {
    constructor(message: string, details?: ErrorDetails);
}

export class ValidationError extends BaseError {
    constructor(message: string, details?: ErrorDetails);
}

export class FileSystemError extends BaseError {
    constructor(message: string, details?: ErrorDetails);
}

export class ConfigurationError extends BaseError {
    constructor(message: string, details?: ErrorDetails);
}

export class ProcessingError extends BaseError {
    constructor(message: string, details?: ErrorDetails);
}

// Config Validator
export interface NumberValidationOptions {
    min?: number;
    max?: number;
    defaultValue?: number;
}

export interface StringValidationOptions {
    pattern?: RegExp;
    defaultValue?: string;
    allowEmpty?: boolean;
}

export interface BooleanValidationOptions {
    defaultValue?: boolean;
}

export interface UrlValidationOptions {
    defaultValue?: string;
}

export class ConfigValidator {
    static validateNumber(value: any, name: string, options?: NumberValidationOptions): number;
    static validateString(value: any, name: string, options?: StringValidationOptions): string;
    static validateBoolean(value: any, name: string, options?: BooleanValidationOptions): boolean;
    static validateUrl(value: any, name: string, options?: UrlValidationOptions): string;
    static validateRequiredKeys(obj: any, requiredKeys: string[], name: string): void;
}

// Config Loader
export class ConfigLoader {
    static loadApiConfig(): any;
    static loadCacheConfig(): any;
    static loadOutputConfig(): any;
    static loadGitHubPagesConfig(): any;
    static loadConfig(): any;
}

// CTB Classes
export class CTBApiClient extends BaseApiClient {}
export class CTBDataCollector extends BaseDataCollector {}
export class CTBDataProcessor extends BaseDataProcessor {}
export class CTBFileManager extends BaseFileManager {}
export class CTBService {
    constructor(options?: any);
    collectAndSaveData(): Promise<Result<any>>;
}

// KMB Classes
export class KMBDataCollector extends BaseDataCollector {}
export class KMBDataProcessor extends BaseDataProcessor {}
export class KMBFileManager extends BaseFileManager {}
export class KMBService {
    constructor(options?: any);
    collectAndSaveData(): Promise<Result<any>>;
}
