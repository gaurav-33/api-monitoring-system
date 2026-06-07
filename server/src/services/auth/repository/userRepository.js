import BaseRepository from "./baseRepository.js";
import User from "../../../shared/models/userModel.js"
import logger from "../../../shared/config/logger.js";
import { APPLICATION_ROLES } from "../../../shared/constant/roles.js";

class MongoUserRepository extends BaseRepository {
    constructor() {
        super(User)
    }

    async create(userData) {
        try {
            let data = { ...userData }
            if (data.role === APPLICATION_ROLES.SUPER_ADMIN && !data.permissions) {
                data.permissions = {
                    canCreateApiKeys: true,
                    canManageUsers: true,
                    canViewAnalytics: true,
                    canExportData: true
                }
            }
            const user = new this.model(data)
            await user.save()

            logger.info('User created successfully', { username: user.username })

            return user
        } catch (error) {
            logger.error('Error while creating user', error)
            throw error
        }
    }

    async findById(id) {
        try {
            const user = await this.model.findById(id)
            return user
        } catch (error) {
            logger.error('Error while finding user by id', error)
            throw error
        }
    }

    async findByUsername(username) {
        try {
            const user = await this.model.findOne({ username })
            return user
        } catch (error) {
            logger.error('Error while finding user by username', error)
            throw error
        }
    }

    async findByEmail(email) {
        try {
            const user = await this.model.findOne({ email })
            return user
        } catch (error) {
            logger.error('Error while finding user by Email', error)
            throw error
        }
    }

    async findAll() {
        try {
            const users = await this.model.find({ isActive: true }).select('-password')
            return users
        } catch (error) {
            logger.error('Error while finding all users', error)
            throw error
        }
    }
}

export default new MongoUserRepository()