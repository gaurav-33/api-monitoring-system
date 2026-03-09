import AppError from "../../../shared/utils/appError.js"
import jwt from 'jsonwebtoken'
import config from "../../../shared/config/index.js"
import logger from "../../../shared/config/logger.js"
import bcrypt from "bcryptjs"

/**
 * Auth Service 
 */
class AuthService {
    constructor(userRepository) {
        if (!userRepository) {
            throw new Error('UserRepository is required')
        }
        this.userRepository = userRepository
    }

    generateToken(user) {
        const payload = {
            userId: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            clientId: user.clientId
        }
        const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn })
        return token
    }

    formatUserData(user) {
        const userObj = user.toObject ? user.toObject() : { ...user }
        delete userObj.password
        return userObj
    }

    async comparePassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword)
    }

    async onBoardSuperAdmin(superAdminData) {
        try {
            const existingUser = await this.userRepository.findAll()

            if (existingUser && existingUser.length > 0) {
                throw new AppError('Super Admin already exists and onboarding is not allowed', 403)
            }

            const user = await this.userRepository.create(superAdminData)
            const token = this.generateToken(user)

            logger.info('Super Admin onboarded successfully')

            return {
                user: this.formatUserData(user), token
            }
        } catch (error) {
            logger.error('Error while onboading super admin', error)
            throw error
        }
    }

    async register(userData) {
        try {
            const existingEmail = await this.userRepository.findByEmail(userData.email)
            if (existingEmail) {
                throw new AppError('Email already exists', 409)
            }

            const existingUsername = await this.userRepository.findByUsername(userData.username)
            if (existingUsername) {
                throw new AppError('Username already exists', 409)
            }
            const user = await this.userRepository.create(userData)
            const token = this.generateToken(user)

            logger.info('User registered successfully')
            return {
                user: this.formatUserData(user),
                token
            }

        } catch (error) {
            logger.error('Error while registering user', error)
            throw error
        }
    }

    async login(username, password) {
        try {
            const user = await this.userRepository.findByUsername(username)
            if (!user) {
                throw new AppError('Invalid credentials', 401)
            }

            if (!user.isActive) {
                throw new AppError('User is not active', 403)
            }
            const isPasswordValid = await this.comparePassword(password, user.password)

            if (!isPasswordValid) {
                throw new AppError('Invalid credentials', 401)
            }


            const token = this.generateToken(user)

            logger.info('User loggedIn successfully', { usename: username })
            return {
                user: this.formatUserData(user),
                token
            }

        } catch (error) {
            logger.error('Error while logging in user', error)
            throw error
        }
    }

    async getProfile(userId) {
        try {
            const user = await this.userRepository.findById(userId)
            if (!user) {
                throw new AppError('User not found', 404)
            }
            return this.formatUserData(user)
        } catch (error) {
            logger.error('Error while getting user profile', error)
            throw error
        }
    }
}

export { AuthService }