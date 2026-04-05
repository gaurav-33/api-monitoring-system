import logger from "../../../shared/config/logger.js"
import { APPLICATION_ROLES, isValidClientRole } from "../../../shared/constant/roles.js"
import AppError from "../../../shared/utils/appError.js"
import { v4 as uuidv4 } from "uuid"
import crypto from "crypto"


export class ClientService {
    constructor(dependencies) {
        if (!dependencies) {
            throw new Error('Dependencies are required')
        }
        if (!dependencies.clientRepository) {
            throw new Error('ClientRepository is required')
        }
        if (!dependencies.apiKeyRepository) {
            throw new Error('ApiKeyRepository is required')
        }
        if (!dependencies.userRepository) {
            throw new Error('UserRepository is required')
        }

        this.clientRepository = dependencies.clientRepository
        this.apiKeyRepository = dependencies.apiKeyRepository
        this.userRepository = dependencies.userRepository
    }

    formatClientData(client) {
        const clientObj = client.toObject ? client.toObject() : { ...client }
        delete clientObj.password
        return clientObj
    }

    /**
     * Genetate unique slug from name
     * @param {String} name 
     * @returns {String}
     */
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')  // remove special chars
            .replace(/\s+/g, '-')          // replace spaces with -
            .replace(/-+/g, '-')           // collapse multiple -
            .replace(/^-+|-+$/g, '')       // trim - from start/end
    }

    canUserAccessClient(clientId, user) {
        if (user.role === APPLICATION_ROLES.SUPER_ADMIN) return true

        return user.clientId && user.clientId.toString() === clientId.toString()
    }

    generateApiKey() {
        return "apim_" + crypto.randomBytes(20).toString('hex')
    }

    async createClient(clientData, adminUser) {
        try {
            const { name, email, description, website } = clientData
            const slug = this.generateSlug(name)

            const existingClient = await this.clientRepository.findBySlug(slug)
            if (existingClient) {
                throw new AppError(`Client with slug: ${slug} already exists`, 400)
            }

            const client = await this.clientRepository.create({
                name,
                email,
                description,
                website,
                slug,
                createdBy: adminUser.userId
            })

            logger.info('Client created successfully', { name: name, website: website })
            return client
        } catch (error) {
            logger.error('Error while creating client user', error)
            throw error
        }
    }

    async createClientUser(clientId, adminUser, userData) {
        try {
            const client = await this.clientRepository.findById(clientId)
            if (!client) {
                throw new AppError('Client not found', 404)
            }

            if (!this.canUserAccessClient(clientId, adminUser)) {
                throw new AppError('Access Denied', 403)
            }
            const { username, email, password, role = APPLICATION_ROLES.CLIENT_VIEWER } = userData

            if (!isValidClientRole(role)) {
                throw new AppError('Invalid role for client user', 400)
            }

            let permissions = {
                canCreateApiKeys: false,
                canManageUsers: false,
                canViewAnalytics: true,
                canExportData: false
            }

            if (role === APPLICATION_ROLES.CLIENT_ADMIN) {
                permissions = {
                    canCreateApiKeys: true,
                    canManageUsers: true,
                    canViewAnalytics: true,
                    canExportData: true
                }
            }

            const existingEmail = await this.userRepository.findByEmail(email)
            if (existingEmail) {
                throw new AppError('Email already exists', 409)
            }
            const existingUsername = await this.userRepository.findByUsername(username)
            if (existingUsername) {
                throw new AppError('Username already exists', 409)
            }

            const user = await this.userRepository.create({
                username,
                email,
                password,
                role,
                clientId,
                permissions
            })

            logger.info('Client User created successfully', {
                userId: user._id,
                clientId: clientId,
                role: role
            })
            return this.formatClientData(user)
        } catch (error) {
            logger.error('Error while creating client user', error)
            throw error
        }
    }

    async createClientApiKey(clientId, adminUser, keyData) {
        try {
            const client = await this.clientRepository.findById(clientId)
            if (!client) {
                throw new AppError('Client not found', 404)
            }
            if (!this.canUserAccessClient(clientId, adminUser)) {
                throw new AppError('Access Denied', 403)
            }
            if (!(adminUser.role === APPLICATION_ROLES.CLIENT_ADMIN || adminUser.role === APPLICATION_ROLES.SUPER_ADMIN)) {
                throw new AppError('Access Denied - Only Super Admin and Client Admin can create API key ', 403)
            }

            const { name, description, environment = 'production' } = keyData

            const keyId = uuidv4()
            const keyValue = this.generateApiKey()

            const apiKey = await this.apiKeyRepository.create({
                name,
                description,
                environment,
                keyId,
                keyValue,
                clientId: clientId,
                createdBy: adminUser.userId
            })
            logger.info('API key created successfully', { name: name, environment: environment, client: clientId })
            return apiKey
        } catch (error) {
            logger.error('Error while creating api key', error)
            throw error
        }
    }

    async getClientApiKeys(clientId, adminUser) {
        try {
            if (!this.canUserAccessClient(clientId, adminUser)) {
                throw new AppError('Access Denied', 403)
            }

            const rawApiKeys = await this.apiKeyRepository.findByClientId(clientId)
            const apiKeys = rawApiKeys.map((key) => {
                const keyObj = key.toObject ? key.toObject() : key
                delete keyObj.keyValue
                return keyObj
            })
            return apiKeys
        } catch (error) {
            logger.error('Error while fetching client API keys', error)
            throw error
        }
    }

    async getClientByApiKey(apiKey) {
        try {
            const key = await this.apiKeyRepository.findByKeyValue(apiKey)
            if (!key) {
                return null
            }
            if (key.isExpired()) {
                return null
            }
            const client = key.clientId
            return {
                client,
                apiKey: key
            }
        } catch (error) {
            logger.error('Error while fetching client by API key', error)
            throw error
        }
    }
}
