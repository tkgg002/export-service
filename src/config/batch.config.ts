const batchConfig = {
  getOptimalBatchSize(recordCount: number) {
    if (!recordCount || Number.isNaN(Number(recordCount))) return 1000;
    const n = Number(recordCount);
    if (n < 100000) return 1000;
    if (n < 1000000) return 5000;
    if (n < 10000000) return 10000;
    return 20000;
  },
  maxWorkers: 4,
};

export default batchConfig;
