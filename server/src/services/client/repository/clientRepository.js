import ClientBaseRepository from "./clientBaseRepository.js";
import Client from "../../../shared/models/clientModel.js"
import logger from "../../../shared/config/logger.js";

class MongoClientRepository extends ClientBaseRepository {
    constructor() {
        super(Client)
    }

    /**
     * Create a new client
     * @param {Object} clientData 
     * @returns {Promise<Object>}
     */
    async create(clientData) {
        try {
            const client = new this.model(clientData)
            await client.save()

            logger.info('Client created successfully', { mongoId: client._id, slug: client.slug })
            return client
        } catch (error) {
            logger.error('Error while creating client', error)
            throw error
        }
    }

    async findById(clientId) {
        try {
            const client = await this.model.findById(clientId);
            return client
        } catch (error) {
            logger.error('Error while finding client by id', error)
            throw error
        }
    }

    async findBySlug(slug) {
        try {
            const client = await this.model.findOne({ slug })
            return client
        } catch (error) {
            logger.error('Error while finding user by slug', error)
            throw error
        }
    }

    async find(filters = {}, options = {}) {
        try {
            const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options

            const clients = await this.model.find(filters)
                .limit(limit)
                .skip(skip)
                .sort(sort)
                .select('-__v')

            return clients
        } catch (error) {
            logger.error('Error while finding user by filters', error)
            throw error
        }
    }

    async count(filters = {}) {
        try {
            const cnt = await this.model.countDocuments(filters)
            return cnt
        } catch (error) {
            logger.error('Error while counting', error)
            throw error
        }
    }
}

export default new MongoClientRepository()