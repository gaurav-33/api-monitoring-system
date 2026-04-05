import logger from "../config/logger.js"
import clientContainer from "../../services/client/dependencies/dependencies.js"
import AppResponse from "../utils/appResponse.js"

const validateApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key']

        if (!apiKey) {
            logger.warn('API request without API key', {
                path: req.path,
                ip: req.ip
            })
            return res
                .status(401)
                .json(AppResponse.error('API key is required', 401))
        }

        // Get client and API key from database
        const result = await clientContainer.services.clientService.getClientByApiKey(apiKey);

        if (!result) {
            logger.warn('Invalid API key attempted', {
                path: req.path,
                ip: req.ip,
                apiKey: apiKey.substring(0, 8) + '...'
            });
            return res
                .status(403)
                .json(AppResponse('Invalid API key', 403))
        }
        const { client, apiKey: apiKeyObj } = result

        // Check if client is active
        if (!client.isActive) {
            logger.warn('Inactive lient attempted API access', {
                path: req.path,
                ip: req.ip,
                clientId: client._id
            });
            return res
                .status(403)
                .json(AppResponse.error('Client account is inactive', 403))
        }

        // Check API key permission
        if (!apiKeyObj.permissions?.canIngest) {
            logger.warn('API key without ingest permission attempted access', {
                path: req.path,
                ip: req.ip,
                apiKeyId: apiKeyObj._id
            })
            return res
                .status(403)
                .json(AppResponse.error('API key does not have ingest permissions', 403))
        }

        // No API key usage tracking required

        // Add client and API key to request
        req.client = client;
        req.apiKey = apiKeyObj;

        logger.debug('API key validated successfully', {
            clientId: client._id,
            clientName: client.name,
            apiKeyId: apiKeyObj._id
        })

        next()
    } catch (error) {
        logger.error('Error validating API key:', error)
        return res
            .status(500)
            .json(AppResponse.error('Internal server error', 500))
    }
}

export default validateApiKey;