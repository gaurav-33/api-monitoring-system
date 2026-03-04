import mongoose from 'mongoose'
import config from '../config/index.js'
import logger from '../config/logger.js'

/**
 * MongoDB database manager
 */
class MongoConnection {
    constructor() {
        this.connection = null
    }

    /**
     * Connect to MongoDB
     * @returns {Promise<mongoose.Connection>}
     */
    async connect() {
        try {
            if (this.connection) {
                logger.info("MongoDB connection already established")
                return this.connection
            }
            await mongoose.connect(config.mongo.uri, {
                dbName: config.mongo.dbName,
            })

            this.connection = mongoose.connection

            logger.info(`MongoDB connection established: ${mongoose.connection.host}`)

            this.connection.on("error", (error) => {
                logger.error("MongoDB connection error:", error)
            })

            this.connection.on("disconnected", () => {
                logger.info("MongoDB connection disconnected")
            })

            return this.connection
        } catch (error) {
            logger.error("Error connecting to MongoDB:", error)
            throw error
        }
    }

    /**
     * Disconnect from MongoDB
     */
    async disconnect() {
        try {
            if (this.connection) {
                this.connection.close()
                this.connection = null
                logger.info("MongoDB connection closed")
            }
        } catch (error) {
            logger.error("Error disconnecting from MongoDB:", error)
            throw error
        }
    }

    /**
     * Get the active connection
     * @returns {mongoose.Connection}
     */
    getConnection() {
        return this.connection
    }
}

export default new MongoConnection();