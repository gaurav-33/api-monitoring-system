import config from "../../../shared/config/index.js"
import { APPLICATION_ROLES } from "../../../shared/constant/roles.js"
import AppResponse from "../../../shared/utils/appResponse.js"

export class AuthController {
    constructor(authService) {
        if (!authService) {
            throw new Error('AuthService is required')
        }
        this.authService = authService
    }

    async onBoardSuperAdmin(req, res, next) {
        try {
            const { username, email, password } = req.body
            const superAdminData = {
                username,
                email,
                password,
                role: APPLICATION_ROLES.SUPER_ADMIN
            }
            const { token, user } = await this.authService.onBoardSuperAdmin(superAdminData)

            res.cookie('authToken', token, {
                httpOnly: config.cookie.httpOnly,
                secure: config.cookie.secure,
                sameSite: config.cookie.sameSite,
                maxAge: config.cookie.expiresIn
            })

            res.status(201).json(AppResponse.success(user, 'Super Admin onboarded successfully', 201))
        } catch (error) {
            next(error)
        }
    }

    async register(req, res, next) {
        try {
            const { username, email, password, role } = req.body
            const userData = {
                username,
                email,
                password,
                role: role || APPLICATION_ROLES.CLIENT_VIEWER
            }
            const { token, user } = await this.authService.register(userData)

            res.cookie('authToken', token, {
                httpOnly: config.cookie.httpOnly,
                secure: config.cookie.secure,
                sameSite: config.cookie.sameSite,
                maxAge: config.cookie.expiresIn
            })

            res.status(201).json(AppResponse.success(user, 'User created successfully', 201))
        } catch (error) {
            next(error)
        }
    }

    async login(req, res, next) {
        try {
            const { username, password } = req.body
            const { user, token } = await this.authService.login(username, password)

            res.cookie('authToken', token, {
                httpOnly: config.cookie.httpOnly,
                secure: config.cookie.secure,
                sameSite: config.cookie.sameSite,
                maxAge: config.cookie.expiresIn
            })

            res.status(200).json(AppResponse.success(user, 'User loggedIn successfully', 200))
        } catch (error) {
            next(error)
        }
    }

    async getProfile(req, res, next) {
        try {
            const userId = req.user.userId
            const user = await this.authService.getProfile(userId)
            res.status(200).json(AppResponse.success(user, 'User profile fetched successfully', 200))
        } catch (error) {
            next(error)
        }
    }

    async logout(_, res, next) {
        try {
            res.clearCookie('authToken')
            res.status(200).json(AppResponse.success(null, 'User logged out successfully', 200))
        } catch (error) {
            next(error)
        }
    }
}