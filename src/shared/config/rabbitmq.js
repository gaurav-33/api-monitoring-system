import amqp from "amqplib"
import config from "../config/index.js"
import logger from "../config/logger.js"

class RabbitMQConnection {
    constructor() {
        this.connection = null,
            this.channel = null,
            this.isConnecting = false
    }

    /**
     * Connect to RabbitMQ and create a channel
     */
    async connect() {
        if (this.channel) {
            return this.channel
        }

        if (this.isConnecting) {
            await new Promise((resolve) => {
                const interval = setInterval(() => {
                    if (!this.isConnecting) {
                        clearInterval(interval)
                        resolve()
                    }
                }, 100)
            })
            return this.channel
        }

        this.isConnecting = true
        try {
            this.connection = await amqp.connect(config.rabbitmq.uri)
            this.channel = await this.connection.createChannel()

            // Dead Letter Queue
            // key && name
            const dlqName = `${config.rabbitmq.queue}.dlq`

            // DL queue
            await this.channel.assertQueue(dlqName, { durable: true })

            // Normal Queue
            await this.channel.assertQueue(config.rabbitmq.queue, {
                durable: true,
                arguments: {
                    "x-dead-letter-exchange": "",
                    "x-dead-letter-routing-key": dlqName
                }
            })


            this.connection.on("error", (err) => {
                this.connection = null
                this.channel = null
                logger.error("RabbitMQ connection error:", err)
            })

            this.connection.on("close", () => {
                logger.info("RabbitMQ connection closed")
                this.connection = null
                this.channel = null
            })

            logger.info("RabbitMQ connection established")
            this.isConnecting = false
            return this.channel
        } catch (error) {
            this.isConnecting = false
            logger.error("RabbitMQ connection failed:", error)
            throw error
        }
    }

    /**
     * Publish message to queue
     * @param {string} queue 
     * @param {Object} message 
     */
    async publishToQueue(queue, message) {
        try {
            if (!this.channel) {
                await this.connect()
            }

            await this.channel.assertQueue(queue, { durable: true })
            const result = this.channel.sendToQueue(
                queue,
                Buffer.from(JSON.stringify(message)),
                { persistent: true }
            )
            return result
        } catch (error) {
            logger.error("Error publishing to RabbitMQ queue:", error)
            throw error
        }
    }

    /**
     * Close RabbitMQ connection
     */
    async close() {
        try {
            if (this.channel) {
                await this.channel.close()
            }
            if (this.connection) {
                await this.connection.close()
            }
            this.channel = null
            this.connection = null
            logger.info("RabbitMQ connection closed successfully")
        } catch (error) {
            logger.error("Error closing RabbitMQ connection:", error)
        }
    }
}

export default new RabbitMQConnection()