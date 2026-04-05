import { EventEmitter } from 'node:events'

export class ConfirmChannelManager extends EventEmitter {
    constructor({ rabbitmq, logger }) {
        super();

        if (!rabbitmq) {
            throw new Error("Confirm Channel Manager requires rabbitMq connection namager")
        }

        this._rabbitmq = rabbitmq;
        this._logger = logger ?? console;
        this._channel = null;
        this._connecting = false;
        this._connectWaiters = [];
    }

    async _connect() {
        this._connecting = true;
        try {
            let connection;
            if (this._rabbitmq.connection) {
                connection = this._rabbitmq.connection;
            } else {
                const baseChannel = await this._rabbitmq.connect();

                if (!baseChannel?.connection) {
                    throw new Error('Failed to obtain RabbitMQ connection')
                }

                connection = baseChannel.connection;
            }

            const confirmChannel = await connection.createConfirmChannel();

            confirmChannel.on('drain', () => this.emit('drain'));

            confirmChannel.on('close', () => {
                this._logger.warn('[ChannelManager] confim channel closed unexpectedly')
                this._channel = null;
            })


            confirmChannel.on('error', (err) => {
                this._logger.warn('[ChannelManager] confim channel error', {
                    error: err.message,
                    stack: err.stack,
                    code: err.code
                })
                this._channel = null;
                this.emit('error', err)
            })

            this._channel = confirmChannel;
            this._logger.info('[ChannelManager] confim channel ready');

            for (const w of this._connectWaiters) {
                w.resolve(confirmChannel);
            }
            this._connectWaiters = [];

            return confirmChannel;
        } catch (error) {
            for (const w of this._connectWaiters) {
                w.reject(error);
            }
            this._connectWaiters = [];
            throw error;
        } finally {
            this._connecting = false;
        }
    }

    async getChannel() {
        if (this._channel) return this._channel;

        if (this._connecting) {
            return new Promise((resolve, reject) => {
                this._connectWaiters.push({ resolve, reject })
            })
        }

        return this._connect();
    }

}