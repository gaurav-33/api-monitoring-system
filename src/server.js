import express from "express";
import cors from "cors"
import helmet from "helmet";
import cookieParser from "cookie-parser";
import config from "./shared/config/index.js";
import logger from "./shared/config/logger.js"
import AppResponse from "./shared/utils/appResponse.js";
import errorHandler from "./shared/middlewares/errorHandler.js";
import MongoConnection from "./shared/config/mongodb.js";
import PostgresConnection from "./shared/config/postgres.js"
import RabbitMQConnection from "./shared/config/rabbitmq.js"

// Routers
import authRouter from "./services/auth/routes/authRoute.js"

/**
 * Initialize Express app
 */
const app = express()

/**
 * Middlewares
 */
app.use(helmet())
app.use(cors({ origin: '*', credentials: true }))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
    })
    next()
})

/**
 * Health Check Route
 */
app.get('/health', (req, res) => {
    res.status(200).json(
        AppResponse.success({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        },
            'Service is Healthy'
        )
    )
})

/**
 * Home Route
 */
app.get('/', (req, res) => {
    res.status(200).json(
        AppResponse.success({
            service: 'API Hit Monitoring System',
            version: '1.0',
        },
            'API Hit Monitoring System'
        )
    )
})

app.use('/api/auth', authRouter)

/**
 * 404 Handler
 */
app.use((req, res) => {
    res.status(404).json(AppResponse.error("Endpoint not found, BE CAREFULL!!", 404))
})

/**
 * Initialize Database and RabbitMQ
 */
async function initConnection() {
    logger.info('Initializing DB and RabbitMQ connections...')
    try {
        // Connect to MongoDB
        await MongoConnection.connect()

        // Connect to Postgres
        await PostgresConnection.testConnection()

        // Connect to RabbitMQ
        await RabbitMQConnection.connect()

        logger.info('Initilized DB and RabbitMQ connection successfully')

    } catch (error) {
        logger.error('Error while conneting to DB and RabbitMQ: ', error)
        throw error
    }
}

async function startServer() {
    try {
        await initConnection()

        const server = app.listen(config.port, () => {
            logger.info(`Server started on port ${config.port}`)
            logger.info(`Server Environment ${config.node_env}`)
            logger.info(`Server avaiable at: http://localhost:${config.port}`)
        })

        const gracefulShutdown = async (signal) => {
            logger.info(`${signal} received, shutting down gracefully...`)

            server.close(async () => {
                logger.info('HTTP server closed')
                try {
                    await MongoConnection.disconnect()
                    await PostgresConnection.close()
                    await RabbitMQConnection.close()
                    logger.info('All connection closed, exiting process')
                    process.exit(0)
                } catch (error) {
                    logger.error('Error while shutdown: ', error)
                    process.exit(1)
                }
            })

            setTimeout(() => {
                logger.error('Forced shutdown')
                process.exit(1)
            }, 10000)
        }

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
        process.on('SIGINT', () => gracefulShutdown('SIGINT'))
        process.on('uncaughtException', (error) => {
            logger.error('Unhandled Exception:', error)
            gracefulShutdown('uncaughtException')
        })
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
            gracefulShutdown('unhandledRejection')
        })
    } catch (error) {
        logger.error('Failed to start server:', error)
        process.exit(1)
    }
}

app.use(errorHandler)

await startServer()