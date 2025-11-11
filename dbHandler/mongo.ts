// dbHandler/mongo.ts
import mongoose, { type Connection } from "mongoose";
import SVC_ENV from "../svc-env.ts";
import type { ServiceBroker } from "moleculer";

export default class MongoDBHandler {
  private logger: ServiceBroker['logger'];
  private connection: Connection | null = null;
  private isConnected = false;

  constructor(logger: ServiceBroker['logger']) {
    this.logger = logger;
  }

  /** Kết nối MongoDB – trả về Promise<Connection> */
  async connect(): Promise<Connection> {
    const config = SVC_ENV.get();
    const mongoUri = config.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MONGO_URI environment variable is not set");
    }

    this.logger.info(`Connecting to MongoDB: ${mongoUri}`);

    this.connection = await mongoose.createConnection(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    // ---- event listeners (không ảnh hưởng tới Promise) ----
    this.connection.on("connected", () => {
      this.logger.info("MongoDB connection established");
      this.isConnected = true;
    });

    this.connection.on("error", (err) => {
      this.logger.error("MongoDB connection error:", err);
      this.isConnected = false;
    });

    this.connection.on("disconnected", () => {
      this.logger.warn?.("MongoDB connection disconnected") ??
        console.warn("MongoDB connection disconnected");
      this.isConnected = false;
    });

    // Đợi thực sự connected
    await new Promise<void>((resolve, reject) => {
      if (this.connection?.readyState === 1) return resolve();
      this.connection?.once("connected", resolve);
      this.connection?.once("error", reject);
    });

    return this.connection;
  }

  /** Đóng kết nối */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.isConnected = false;
      this.logger.info("MongoDB connection closed");
    }
  }

  /** Alias */
  async close(): Promise<void> {
    return this.disconnect();
  }

  /** Lấy connection – ném lỗi nếu chưa có */
  getConnection(): Connection {
    if (!this.isConnected || !this.connection) {
      throw new Error("MongoDB connection not available");
    }
    return this.connection;
  }

  /** Kiểm tra sức khỏe */
  isHealthy(): boolean {
    return !!this.isConnected && !!this.connection && this.connection.readyState === 1;
  }
}