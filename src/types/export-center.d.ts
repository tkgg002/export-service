export interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export interface Broker {
  call(action: string, params: any): Promise<any>;
}

export interface CacheService {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl: number): Promise<void>;
}

export interface Metrics {
  // Define metrics interface if needed
}

export interface CircuitBreaker {
  // Define circuitBreaker interface if needed
}

export interface JobTracker {
  setStatus(jobId: string, status: any): Promise<void>;
}

export interface ExportConfig {
  enabled: boolean;
  processor?: any; // This will be a class constructor or a path to one
  cacheTTL?: number;
  useWorker?: boolean;
  exportType: string;
  cacheKey: (params: any) => string;
  fileName: string;
  sheetName: string;
  dbType?: string;
  dataAccess: string;
  columns: (lang: string) => string[];
  defaultFilters?: any;
  transform?: (row: any, lang: string) => any;
}

export type ExportConfigFromFile = Omit<ExportConfig, 'exportType' | 'cacheKey'>;

export interface ExportCenterConstructorParams {
  logger: Logger;
  broker: Broker;
  cacheService: CacheService;
  metrics: Metrics;
  circuitBreaker: CircuitBreaker;
  jobTracker: JobTracker;
}
