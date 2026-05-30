import { BaseRepository } from "./BaseRepository.js";

export class ApiHitRepository extends BaseRepository {
    constructor({ model, logger: l } = {}) {
        super({ logger: l })

        if (!model) {
            throw new Error('ApiHitRepository required mongoose model')
        }
        this.model = model
    }

    async save(eventData) {
        try {
            const doc = new this.model(eventData)
            await doc.save()

            this.logger.info('Api hit saved to MongoDB', { eventId: eventData.eventId })
            return doc
        } catch (error) {
            if (error && error.code === 11000) {
                this.logger.warn('Duplicate event ID, skipping save', { eventID: eventData.eventId })
                return null
            }
            this.logger.error('Error saving Api hit:', error)
            throw error
        }
    }

    async find(filter = {}, options = {}) {
        try {
            const { limit = 100, skip = 0, sort = { timestamp: -1 } } = options

            const hits = await this.model.find(filter)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .lean()

            return hits
        } catch (error) {
            this.logger.error('Error finding Api hits:', error)
            throw error
        }
    }

    async count(filters = {}) {
        try {
            const count = await this.model.countDocuments(filters)
            return count
        } catch (error) {
            this.logger.error('Error counting Api hits:', error)
            throw error
        }
    }

    async deleteOldHits(beforeDate) {
        try {
            const result = await this.model.deleteMany({ timestamp: { $lt: beforeDate } })
            this.logger.info('Deleted old Api hits,', { count: result.deletedCount })
            return result.deletedCount
        } catch (error) {
            this.logger.error('Error deleting old Api hits:', error)
            throw error
        }
    }
}