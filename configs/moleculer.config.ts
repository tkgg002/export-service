// configs/moleculer.config.ts
import os from "os";

// CẤU HÌNH BROKER – HOÀN TOÀN ESM
const brokerConfig = {
  namespace: process.env.NAMESPACE || "GOOPAY-CORE",

  nodeID: `${process.env.SERVICE_NAME || "export-service"}-${process.env.NODEID ? process.env.NODEID + "-" : ""}${os.hostname().toLowerCase()}`,

  metadata: {},

  logger: [
    {
      type: "Console",
      options: {
        level: {
          METRICS: false,
          CONTROL: false,
          "**": "info",
        },
        colors: true,
        moduleColors: true,
        formatter: "full",
        objectPrinter: (obj: any) => JSON.stringify(obj),
        autoPadding: true,
      },
    },
  ],

  transporter: process.env.NATS || undefined,

  requestTimeout: 10 * 1000,

  retryPolicy: {
    enabled: true,
    retries: 5,
    delay: 100,
    maxDelay: 1000,
    factor: 2,
    check: (err: Error) => err && !!(err as any).retryable,
  },

  cacher: process.env.REDIS_URI
    ? {
        type: "Redis",
        options: {
          uri: process.env.REDIS_URI,
          ttl: 3600,
        },
      }
    : undefined,

  serializer: "JSON",

  maxCallLevel: 100,
  heartbeatInterval: 10,
  heartbeatTimeout: 30,
  contextParamsCloning: false,

  tracking: {
    enabled: false,
    shutdownTimeout: 5000,
  },

  disableBalancer: false,

  registry: {
    strategy: "RoundRobin",
    preferLocal: true,
  },

  circuitBreaker: {
    enabled: false,
    threshold: 0.5,
    minRequestCount: 20,
    windowTime: 60,
    halfOpenTime: 10 * 1000,
    check: (err: Error) => err && (err as any).code != null && (err as any).code >= 500,
  },

  bulkhead: {
    enabled: false,
    concurrency: 10,
    maxQueueSize: 100,
  },

  validator: true,
  errorHandler: null,

  // Metrics
  metrics: {
    enabled: !!process.env.METRICS_PORT,
    reporter: [
      {
        type: "Prometheus",
        options: {
          port: Number(process.env.METRICS_PORT) || 9464,
          path: "/metrics",
          defaultLabels: (registry: any) => ({
            namespace: registry.broker.namespace,
            nodeID: registry.broker.nodeID,
          }),
        },
      },
    ],
  },

  // Tracing
  tracing: {
    enabled: false,
    exporter: [
      {
        type: "Jaeger",
        options: {
          endpoint: null,
          host: process.env.JAEGER_HOST || "127.0.0.1",
          port: Number(process.env.JAEGER_PORT) || 6832,
          sampler: {
            type: "Const",
            options: { decision: 1 },
          },
          tracerOptions: {},
          defaultTags: null,
        },
      },
    ],
  },

  middlewares: [],

  hotReload: true,
};

export default brokerConfig;
