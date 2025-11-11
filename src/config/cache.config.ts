export default {
  defaultTTLSeconds: 3600,
  localTTLms: 60_000,
  key(prefix: string, parts: any = {}) {
    try {
      return `${prefix}:` + Buffer.from(JSON.stringify(parts)).toString('base64');
    } catch {
      return `${prefix}:${Date.now()}`;
    }
  }
};
