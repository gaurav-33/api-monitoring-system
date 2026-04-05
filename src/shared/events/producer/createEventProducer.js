import config from "../../config/index.js";
import logger from "../../config/logger.js";
import rabbitmq from "../../config/rabbitmq.js"

import { CircuitBreaker } from "./CircuitBreaker.js";
import { RetryStrategy } from "./RetryStrategy.js";
import { ConfirmChannelManager } from "./ConfirmChannelManager.js";
import { EventProducer } from "./eventProducer.js";

export function createEventProducer(overrides = {}) {
    const log = overrides.logger ?? logger;
    const rmq = overrides.rabbitmq ?? rabbitmq;
    const queueName = overrides.queueName ?? config.rabbitmq.queue;

    if (!rmq) throw new Error('RabbitMQ connection manager is required');
    if (!queueName) throw new Error('Queue name must be specified');
    if (!config.rabbitmq.retryAttempts || config.rabbitmq.retryAttempts < 0) {
        throw new Error('Invalid retry attemps configuration');
    }

    const channelManager = overrides.channelManager ?? new ConfirmChannelManager({ rabbitmq: rmq, logger: log })
    const circuitBreaker = overrides.circuitBreaker ?? new CircuitBreaker({
        failureThreshold: 2, //config.circuitBreaker.failureThreshold ?? 5,
        cooldownMs: config.circuitBreaker.cooldownMs ?? 30000,
        halfOpenMaxAttempts: config.circuitBreaker.halfOpenMaxAttempts ?? 3,
        logger: log
    })

    const retryStrategy = overrides.retryStrategy ?? new RetryStrategy({
        maxRetries: config.rabbitmq.retryAttempts ?? 3,
        baseDelayMs: config.retryStrategy.baseDelayMs ?? 200,
        maxDelayMs: config.retryStrategy.maxDelayMs ?? 5000,
        jitterFactor: config.retryStrategy.jitterFactor ?? 0.3,
    });

    return new EventProducer({
        channelManager, circuitBreaker, retryStrategy, logger: log, queueName
    })
}