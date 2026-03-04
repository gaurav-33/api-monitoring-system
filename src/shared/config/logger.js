import config from "../config/index.js";
import winston from "winston";

/**
 * Winston Logger Configuration, provides logging!
 */
const logger = winston.createLogger({
    level: config.node_env === "development" ? "debug" : "info",
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),

    defaultMeta: { service: 'api-monitoring-service' },

    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ]
})

if (config.node_env !== "production") {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }))
}

export default logger;