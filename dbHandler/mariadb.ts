import { Sequelize } from 'sequelize';
import SVC_ENV from '../svc-env.ts';
import { ServiceBroker } from 'moleculer';

class MariaDBHandler {
	private logger: ServiceBroker['logger'];
	private sequelize: Sequelize | null;
	private isConnected: boolean;

	constructor(logger: ServiceBroker['logger']) {
		this.logger = logger;
		this.sequelize = null;
		this.isConnected = false;
	}

	async connect(callback: (err: Error | null, conn?: Sequelize) => void) {
		try {
			const config = SVC_ENV.get();

			// Build base options
			const baseOptions: any = {
				dialect: 'mysql',
				define: { timestamps: true, underscored: true, freezeTableName: true },
				logging: config.NODE_ENV === 'development' ? this.logger.debug.bind(this.logger) : false,
				timezone: '+07:00',
				dialectOptions: {
					charset: 'utf8mb4',
					supportBigNumbers: true,
					bigNumberStrings: true,
					flags: '-FOUND_ROWS'
				},
				pool: {
					max: Number(config.DB_POOL_MAX || 50),
					min: Number(config.DB_POOL_MIN || 5),
					acquire: Number(config.DB_POOL_ACQUIRE || 60000),
					idle: Number(config.DB_POOL_IDLE || 30000)
				}
			};

			// Parse replicas if provided: DB_REPLICA_HOSTS=host1:3306,host2:3306
			const replicaHosts = (config.DB_REPLICA_HOSTS || '')
				.split(',')
				.map((x: string) => x.trim())
				.filter(Boolean);

			if (replicaHosts.length > 0) {
				this.logger.info(`Using replication with ${replicaHosts.length} read replicas`);
				const replication = {
					write: {
						host: config.DB_HOST,
						port: Number(config.DB_PORT),
						username: config.DB_USERNAME,
						password: config.DB_PASSWORD,
						database: config.DB_DATABASE
					},
					read: replicaHosts.map((h: string) => {
						const [host, port] = h.split(':');
						return {
							host,
							port: Number(port || config.DB_PORT),
							username: config.DB_USERNAME,
							password: config.DB_PASSWORD,
							database: config.DB_DATABASE
						};
					})
				};
				this.sequelize = new Sequelize({ ...baseOptions, replication });
			} else {
				// Single host (no replicas)
				this.sequelize = new Sequelize(
					config.DB_DATABASE,
					config.DB_USERNAME,
					config.DB_PASSWORD,
					{
						...baseOptions,
						host: config.DB_HOST,
						port: Number(config.DB_PORT),
					}
				);
			}

			await this.sequelize.authenticate();
			this.isConnected = true;
			this.logger.info('✅ MariaDB connection established');
			callback(null, this.sequelize);
		} catch (error: any) {
			this.logger.error('❌ Failed to connect to MariaDB:', error);
			callback(error, undefined);
		}
	}

	async disconnect() {
		try {
			if (this.sequelize) {
				await this.sequelize.close();
				this.isConnected = false;
				this.logger.info('✅ MariaDB connection closed');
			}
		} catch (error: any) {
			this.logger.error('❌ Error disconnecting from MariaDB:', error);
		}
	}

	getConnection(): Sequelize {
		if (!this.isConnected || !this.sequelize) {
			throw new Error('MariaDB connection not available');
		}
		return this.sequelize;
	}

	isHealthy(): boolean {
		return !!this.isConnected;
	}
}

export default MariaDBHandler;
