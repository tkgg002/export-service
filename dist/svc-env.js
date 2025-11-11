import _ from "lodash";
const _env = {};
const SVC_ENV = {
    set(key, val) {
        _env[key] = val;
        return _env[key];
    },
    get() {
        return _env;
    },
    getRequiredKey() {
        return [
            "SERVICE_NAME",
            "DB_HOST",
            "DB_PORT",
            "DB_USERNAME",
            "DB_PASSWORD",
            "DB_DATABASE",
            "MONGO_URI",
            "STORAGE_GATEWAY_SERVICE",
            "REDIS_HOST",
            "REDIS_PORT",
            "PORT",
            "MAX_BATCH_SIZE",
            "MAX_EXPORT_DAYS",
            "SECOND_SECRET_KEY",
            "SIGNATURE_SECRET_KEY",
            "NAMESPACE",
            "NATS",
            "PAYMENT_BILLS_DB_TYPE"
        ];
    },
    setEnvironments(broker, serviceName) {
        let envSv = broker.services.find((x) => x.name === serviceName);
        let envServices = envSv && envSv.settings && envSv.settings.envServices;
        if (_.isEmpty(envServices)) {
            broker.logger.info("Load Env Service From Broker.EnvServices");
            envServices = broker.envServices ? broker.envServices[serviceName] : null;
        }
        if (_.isEmpty(envServices)) {
            broker.logger.info("Load Env Service From Process.Env");
            envServices = JSON.parse(JSON.stringify(process.env));
        }
        Object.keys(envServices).forEach(key => {
            SVC_ENV.set(key, envServices[key] || "");
        });
        return Promise.resolve();
    }
};
export default SVC_ENV;
//# sourceMappingURL=svc-env.js.map