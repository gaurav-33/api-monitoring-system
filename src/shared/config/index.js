import dotenv from "dotenv"

dotenv.config()
/**
 * Configuration for all the env variables and common app config
 */
const config = {
    // Server
    node_env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || "3000", 10),

    // Mongo DB
    mongo: {
        uri: process.env.MONGO_URI || "mongodb://localhost:27017/api_monitoring",
        dbName: process.env.MONGO_DB_NAME || "api_monitoring",
    },

    // Postgres sql
    postgres: {
        host: process.env.PG_HOST || "localhost",
        port: parseInt(process.env.PG_PORT || "5432", 10),
        user: process.env.PG_USER || "postgres",
        password: process.env.PG_PASSWORD || "password",
        database: process.env.PG_DATABASE || "api_monitoring",
    },

    // RabbitMQ
    rabbitmq: {
        uri: process.env.RABBITMQ_URI || "amqp://api_user:api_password@localhost:5672/api_monitoring",
        queue: process.env.RABBITMQ_QUEUE || "api_hits",
        publisherConfirms: process.env.RABBITMQ_PUBLISHER_CONFIRMS === "true" || false,
        retryAttempts: parseInt(process.env.RABBITMQ_RETRY_ATTEMPTS || "3", 10),
        retryDelay: parseInt(process.env.RABBITMQ_RETRY_DELAY || "1000", 10),
    },

    // Json Web Token
    jwt: {
        secret: process.env.JWT_SECRET || "aplhabetagamma",
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    },

    // Rate Limiter
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX || "1000", 10), // 1000req per 15 min per IP
    },

    // apiKey Schema
    apiKey: {
        expiresIn: parseInt(process.env.API_KEY_EXPIRY_DAYS || "365", 10,)
    },

    // cookie config
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expiresIn: parseInt(process.env.COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000 || 24 * 60 * 60 * 1000
    }
    
}

export default config;