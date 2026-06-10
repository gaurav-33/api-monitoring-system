import { z } from 'zod'
import { EVENT_TYPES } from '../../shared/events/eventContracts.js'
import { isRetryable, RetryStrategy } from '../../shared/events/producer/RetryStrategy.js'
import processorContainer from './dependencies/dependencies.js'
import { CircuitBreaker } from '../../shared/events/producer/CircuitBreaker.js'
import mongodb from "../../shared/config/mongodb.js"
import rabbitmq from "../../shared/config/rabbitmq.js"
import config from "../../shared/config/index.js"
import logger from '../../shared/config/logger.js'
import postgres from '../../shared/config/postgres.js'

const messageSchema = z.object({
    type: z.nativeEnum(EVENT_TYPES),
    data: z.record(z.string(), z.unknown()),
    messageId: z.string().optional(),
    timestamp: z.union([z.string(), z.number()]).optional()
})

class EventConsumer {
    constructor({
        processorService,
        rabbitmq,
        mongodb,
        postgres,
        config,
        logger,
        retryStrategy,
        circuitBreaker
    }) {
        this._processorService = processorService
        this._rabbitmq = rabbitmq
        this._mongodb = mongodb
        this._postgres = postgres
        this._config = config
        this._logger = logger
        this._retryStrategy = retryStrategy
        this._circuitBreaker = circuitBreaker

        this.isRunning = false
        this.channel = null
        this._stats = {
            processed: 0,
            failed: 0,
            retried: 0,
            dlqRouted: 0,
            lastProcessedAt: null
        }
        this._processedIds = new Set()
        this._poisonMessage = new Map()
    }

    async start() {
        try {
            await this._connectDatabases()

            this.channel = await this._rabbitmq.connect()
            const prefetch = this._config.consumer?.prefetch || 10
            this.channel.prefetch(prefetch)

            this.channel.on('error', (err) => {
                this._logger.error('Consumer channel error:', err)
                this._circuitBreaker.onFailure()
            })

            this.channel.on('close', () => {
                this._logger.error('Consumer channel closed unexpectedly:')
                if (this.isRunning) this._reconnect()
            })

            this._logger.info(`Started consuming from queue: ${this._config.rabbitmq.quque}`)
            this.isRunning = true

            await this.channel.consume(
                this._config.rabbitmq.queue,
                async (msg) => {
                    if (msg !== null) await this._handleMessage(msg)
                },
                { noAck: false, consumerTag: `consumer-${Date.now()}` }
            )
            this._logger.info('Event consumer is running')
        } catch (error) {
            this._logger.error('Failed to start consumer:', error)
            await this._cleanup()
            throw error
        }
    }


    async _connectDatabases() {
        const maxRetries = 5
        let retries = 0

        while (retries < maxRetries) {
            try {
                this._logger.info('Connecting to databases...')
                await Promise.all([
                    this._mongodb.connect(),
                    this._postgres.testConnection()
                ])
                this._logger.info('Database connections established')
                return
            } catch (error) {
                retries++
                this._logger.error(`Database connection attempt ${retries} failed:`, error)
                if (retries >= maxRetries) {
                    throw new Error(`Failed to connect to Database after ${maxRetries} attempts`)
                }
                await new Promise(resolve => setTimeout(resolve, 5000 * retries))
            }
        }
    }

    async _reconnect() {
        try {
            await new Promise(resolve => setTimeout(resolve, 5000))
            this.channel = await this._rabbitmq.connect()
            const prefetch = this._config.consumer?.prefetch || 10
            this.channel.prefetch(prefetch)

            this.channel.on('error', (err) => {
                this._logger.error('Consumer channel error:', err)
                this._circuitBreaker.onFailure()
            })

            this.channel.on('close', () => {
                this._logger.error('Consumer channel closed unexpectedly:')
                if (this.isRunning) this._reconnect()
            })
            await this.channel.consume(
                this._config.rabbitmq.queue,
                async (msg) => {
                    if (msg !== null) await this._handleMessage(msg)
                },
                { noAck: false, consumerTag: `consumer-${Date.now()}` }
            )
        } catch (error) {
            this._logger.error('Failed to reconnect:', error)
            if (this.isRunning) {
                setTimeout(() => this._reconnect(), 10000)
            }
        }
    }

    async _cleanup() {
        try {
            this.isRunning = false
            if (this.channel) {
                await this.channel.close()
                this.channel = null
            }
        } catch (error) {
            this._logger.error('Error during cleanup:', error)
        }
    }

    async _handleMessage(msg) {
        if (!this._circuitBreaker.allowRequest()) {
            this._logger.warn('Circuit breaker open, requeuing message')
            this.channel.nack(msg, false, true)
            return
        }
        const startTime = Date.now()
        let messageData = null
        try {
            messageData = this._parseMessage(msg)
            // Idempotency
            if (this._processedIds.has(messageData.messageId)) {
                this._logger.debug('Duplicate message skipped', { messageId: messageData.messageId })
                this.channel.ack(msg)
                return
            }
            await this._processMessage(messageData)

            this.channel.ack(msg)
            this._circuitBreaker.onSuccess()
            this._stats.processed++
            this._stats.lastProcessedAt = new Date()
            this._processedIds.add(messageData.messageId)

            if (this._processedIds.size > 100_00) {
                const first = this._processedIds.values().next().value
                this._processedIds.delete(first)
            }

            this._poisonMessage.delete(messageData.type)
        } catch (error) {
            await this._handleProcessingError(error, msg, messageData, startTime)
        }
    }

    _parseMessage(msg) {
        try {
            const content = msg.content.toString()
            const messageData = JSON.parse(content)
            const parsed = messageSchema.safeParse(messageData)
            if (!parsed.success) {
                throw new Error(`Schema validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`)
            }
            return {
                ...parsed.data,
                messageId: msg.properties.messageId || messageData.messageId || 'unknown',
                retryCount: parseInt(msg.properties.headers?.['x-retry-count'] || 0, 10)
            }
        } catch (error) {
            throw new Error(`Message parsing failed: ${error.message}`)
        }
    }

    async _processMessage(messageData) {
        switch (messageData.type) {
            case EVENT_TYPES.API_HIT:
                await this._processorService.processEvent(messageData.data)
                break;

            default:
                throw new Error(`Unknown event type: ${messageData.type}`)
        }
    }

    async _handleProcessingError(error, msg, messageData, startTime) {
        const messageId = messageData?.messageId || msg.properties?.messageId || 'unknown'
        const retryCount = messageData?.retryCount || 0
        this._circuitBreaker.onFailure()
        this._stats.failed++

        const eventType = messageData?.type || 'unknown'
        const poisonCount = (this._poisonMessage.get(eventType) || 0) + 1
        this._poisonMessage.set(eventType, poisonCount)
        if (poisonCount >= 10) {
            this._logger.error('Poison message pattern detected', { eventType, consecutiveFailures: poisonCount })
        }

        // Non-retryable errors -- go straight to DLQ
        if (!isRetryable(error) || !this._retryStrategy.shouldRetry(retryCount)) {
            await this._sendToDLQ(msg, error, retryCount >= this._retryStrategy.maxRetries ? 'MAX_RETRIES_EXCEEDED' : 'NON_RETRYABLE')
            return
        }

        await this._retryMessage(msg, retryCount)
    }

    async _sendToDLQ(msg, error, reason) {
        try {
            const dlqName = `${this._config.rabbitmq.queue}.dlq`
            this.channel.sendToQueue(dlqName, msg.content, {
                ...msg.properties,
                persistent: true,
                headers: {
                    ...msg.properties.headers,
                    'x-dlq-reason': reason,
                    'x-dlq-error': error.message,
                    'x-dlq-timestamp': Date.now(),
                    'x-original-queue': this._config.rabbitmq.queue
                }
            })

            this.channel.ack(msg)
            this._stats.dlqRouted++
        } catch (error) {
            this._logger.error('Failed to send messsage to DLQ:', error)
            this.channel.nack(msg, false, false)
        }
    }

    async _retryMessage(msg, retryCount) {
        const delay = this._retryStrategy.delay(retryCount)

        const retryHeaders = {
            ...msg.properties,
            persistent: true,
            headers: {
                ...msg.properties.headers,
                'x-dlq-count': retryCount + 1,
                'x-dlq-error': error.message,
                'x-dlq-delay': delay,
                'x-original-queue': this._config.rabbitmq.queue
            }
        }

        setTimeout(() => {
            try {
                this.channel.sendToQueue(this._config.rabbitmq.queue, msg.content,
                    { ...msg.properties, headers: retryHeaders }
                )
                this._logger.info('Message scheduled for retry', {
                    messageId: msg.properties.messageId,
                    retryCount: retryCount + 1,
                    delay
                })
            } catch (error) {
                this._logger.error('Failed to schedule retry:', error)
                this._sendToDLQ(msg, error, 'RETRY_FAILED')
            }
        }, delay)

        this.channel.ack(msg)
        this._stats.retried++
    }

    async stop() {
        try {
            await this._cleanup()
            await Promise.all([
                this._rabbitmq.close(),
                this._mongodb.disconnect(),
                this._postgres.close()
            ])

        } catch (error) {
            this._logger.error('Error stopping consumer:', error)
        }
    }


}

const circuitBreaker = new CircuitBreaker({
    failureThreshold: config.circuitBreaker.failureThreshold ?? 5,
    cooldownMs: config.circuitBreaker.cooldownMs ?? 30000,
    halfOpenMaxAttempts: config.circuitBreaker.halfOpenMaxAttempts ?? 3,
    logger
})

const retryStrategy = new RetryStrategy({
    maxRetries: config.rabbitmq.retryAttempts ?? 3,
    baseDelayMs: config.retryStrategy.baseDelayMs ?? 200,
    maxDelayMs: config.retryStrategy.maxDelayMs ?? 5000,
    jitterFactor: config.retryStrategy.jitterFactor ?? 0.3,
});

const consumer = new EventConsumer({
    processorService: processorContainer.services.processorService,
    mongodb,
    rabbitmq,
    postgres,
    config,
    logger,
    retryStrategy,
    circuitBreaker
})


async function startConsumerWithRetry() {
    const startupRetry = new RetryStrategy({
        maxRetries: 5,
        baseDelayMs: 5000,
        maxDelayMs: 30000,
    })
    let attempt = 0

    while (startupRetry.shouldRetry(attempt) || attempt === 0) {
        try {
            logger.info(`Starting consumer (attempt ${attempt + 1})`)
            await consumer.start()
            logger.info('Consumer started successfully')
            return
        } catch (error) {
            attempt++
            logger.error(`Consumer start attempt ${attempt} failed:`, error)

            if (!startupRetry.shouldRetry(attempt)) {
                logger.error('Max retries reached, existing...')
                process.exit(1)
            }
            await startupRetry.wait(attempt - 1)
        }
    }
}

process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...')
    await consumer.stop()
    process.exit(0)
})

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...')
    await consumer.stop()
    process.exit(0)
})

process.on('uncaughtException', (error) => {
    logger.info('Uncaught Exception:', error)
    process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
    logger.info('Unhandled Promise Rejection at:', promise, 'reason', reason)
    process.exit(1)
})

if (config.deployOnSameServer !== true) {
    startConsumerWithRetry()
}

export default consumer;
export { startConsumerWithRetry };