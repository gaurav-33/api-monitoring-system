import AppResponse from "../../../shared/utils/appResponse.js"

export class ClientController {
    constructor(clientService, authService) {
        if (!clientService) {
            throw new Error('ClientService is required')
        }
        if (!authService) {
            throw new Error('AuthService is required')
        }
        this.clientService = clientService
        this.authService = authService
    }

    /**
     * Create client
     * @param {Request} req 
     * @param {Response} res 
     * @param {*} next 
     * @returns {}
     */
    async createClient(req, res, next) {
        try {
            const isSuperAdmin = await this.authService.checkSuperAdmin(req.user.userId)
            if (!isSuperAdmin) {
                return res.status(403).json(AppResponse.error('Access Denied', 403))
            }

            const client = await this.clientService.createClient(req.body, req.user)
            return res.status(201).json(AppResponse.success(client, 'Client created successfully', 201))
        } catch (error) {
            next(error)
        }
    }

    /**
     * Create client User
     * @param {Request} req 
     * @param {Response} res 
     * @param {*} next 
     */
    async createClientUser(req, res, next) {
        try {
            const { clientId } = req.params

            const user = await this.clientService.createClientUser(clientId, req.user, req.body)

            return res.status(201).json(AppResponse.success(user, 'Client User created successfully', 201))
        } catch (error) {
            next(error)
        }
    }

    /**
     * Create client API key
     * @param {Request} req 
     * @param {Response} res 
     * @param {*} next 
     */
    async createClientApiKey(req, res, next) {
        try {
            const { clientId } = req.params

            const apiKey = await this.clientService.createClientApiKey(clientId, req.user, req.body)

            return res.status(201).json(AppResponse.success(apiKey, 'Client API key created successfully', 201))
        } catch (error) {
            next(error)
        }
    }

    /**
     * Get client API keys
     * @param {Request} req 
     * @param {Response} res 
     * @param {*} next 
     */
    async getClientApiKeys(req, res, next) {
        try {
            const { clientId } = req.params

            const apiKeys = await this.clientService.getClientApiKeys(clientId, req.user, req.body)

            return res.status(201).json(AppResponse.success(apiKeys, 'Client API key fetched successfully', 201))
        } catch (error) {
            next(error)
        }
    }
}