class CircuitBreaker {
    failureCount;
    failureThreshold;
    recoveryTimeout;
    logger;
    state;
    lastFailureTime;
    constructor({ failureThreshold = 5, recoveryTimeout = 60000, logger } = {}) {
        this.failureCount = 0;
        this.failureThreshold = failureThreshold;
        this.recoveryTimeout = recoveryTimeout;
        this.logger = logger;
        this.state = 'CLOSED';
        this.lastFailureTime = 0;
    }
    async exec(fn) {
        if (this.state === 'OPEN') {
            const canHalfOpen = Date.now() - this.lastFailureTime > this.recoveryTimeout;
            if (!canHalfOpen)
                throw new Error('Circuit breaker is OPEN');
            this.state = 'HALF_OPEN';
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (err) {
            this.onFailure(err);
            throw err;
        }
    }
    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }
    onFailure(err) {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            if (this.logger)
                this.logger.warn('Circuit breaker opened: ' + (err?.message || ''));
        }
    }
}
export default CircuitBreaker;
//# sourceMappingURL=circuit-breaker.js.map