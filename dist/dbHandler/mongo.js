import mongoose from "mongoose";
import SVC_ENV from "../svc-env.ts";
export default class MongoDBHandler {
    logger;
    connection = null;
    isConnected = false;
    constructor(logger) {
        this.logger = logger;
    }
    async connect() {
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
        await new Promise((resolve, reject) => {
            if (this.connection?.readyState === 1)
                return resolve();
            this.connection?.once("connected", resolve);
            this.connection?.once("error", reject);
        });
        return this.connection;
    }
    async disconnect() {
        if (this.connection) {
            await this.connection.close();
            this.isConnected = false;
            this.logger.info("MongoDB connection closed");
        }
    }
    async close() {
        return this.disconnect();
    }
    getConnection() {
        if (!this.isConnected || !this.connection) {
            throw new Error("MongoDB connection not available");
        }
        return this.connection;
    }
    isHealthy() {
        return !!this.isConnected && !!this.connection && this.connection.readyState === 1;
    }
}
//# sourceMappingURL=mongo.js.map