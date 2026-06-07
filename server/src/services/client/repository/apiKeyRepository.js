import ApiKeyBaseRepository from "./apiKeyBaseRepository.js"
import ApiKey from "../../../shared/models/apiKeyModel.js"
import logger from "../../../shared/config/logger.js"


class MongoApiKeyRepository extends ApiKeyBaseRepository {
    constructor() {
        super(ApiKey)
    }

    async create(apiKeyData) {
        try {
            const apiKey = this.model(apiKeyData)
            await apiKey.save()
            logger.info('API key created successfully', { keyId: apiKey.keyId })
            return apiKey
        } catch (error) {
            logger.error('Error while creating API key', error)
        }
    }

    async findByKeyValue(keyValue, isActiveIncluded = false) {
        try {
            const query = { keyValue }
            if (!isActiveIncluded) query.isActive = true

            const apiKey = await this.model.findOne(query)
                .populate('clientId')
            return apiKey
        } catch (error) {
            logger.error('Error while finding API key by value', error)
            throw error
        }
    }

    async findByClientId(clientId, filters = {}) {
        try {
            const query = { clientId, ...filters }
            const apiKeys = await this.model.find(query)
                .populate('createdBy', 'username email')
                .sort({ createdAt: -1 })
            return apiKeys
        } catch (error) {
            logger.error('Error while finding API key by clientID', error)
            throw error
        }
    }

    async countByClientId(clientId, filters = {}) {
        try {
            const query = { clientId, ...filters }
            const cnt = await this.model.countDocuments(query)
            return cnt
        } catch (error) {
            logger.error('Error while counting API key by clientID', error)
            throw error
        }
    }
}

export default new MongoApiKeyRepository()