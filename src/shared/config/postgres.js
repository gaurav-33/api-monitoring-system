import pg from 'pg'
import config from '../config/index.js'
import logger from '../config/logger.js'

const { Pool } = pg

class PostgresConnection {
    constructor() {
        this.pool = null
    }

    /**
     * Get the Pool
     * @returns {Promise<pg.Pool>}
     */
    getPool() {
        if (this.pool) {
            this.pool = new Pool({
                host: config.postgres.host,
                port: config.postgres.port,
                user: config.postgres.user,
                password: config.postgres.password,
                database: config.postgres.database,
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            })

            this.pool.on('error', (err) => {
                logger.error('Postgres connection error:', err)
            })

            logger.info('Postgres connection established')
            return this.pool
        }
    }

    /**
     * Test and Connect the connection
     */
    async testConnection() {
        try {
            const pool = this.getPool()
            const client = await pool.connect()
            await client.query('SELECT NOW()')
            client.release()

            logger.info(`Postgres connection test successful at ${result.rows[0].now}`)
        } catch (error) {
            logger.error('Postgres connection test failed:', error)
            throw error
        }
    }

    /**
     * Run Postgres Query
     * @returns {Promise<pg.Result>}
     */
    async query(text, params) {
        try {
            const pool = this.getPool()
            const start = Date.now()
            const result = await pool.query(text, params)
            const duration = Date.now() - start
            logger.debug('Postgres executed query', { text, rows: result.rowCount, duration })
            return result
        } catch (error) {
            logger.error("Postgres query error:", error)
            throw error
        }
    }

    /**
     * Close Postgres connection
     */
    async close() {
        if (this.pool) {
            await this.pool.end()
            this.pool = null
            logger.info('Postgres connection closed')
        }
    }
}

export default new PostgresConnection();