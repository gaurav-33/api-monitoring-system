import AppResponse from "../utils/appResponse.js"
import jwt from 'jsonwebtoken'
import config from "../config/index.js"

const authenticate = async (req, res, next) => {
    try {
        let token = req.headers.authorization || req.cookies.authToken

        if (!token) {
            return res.status(401).json(AppResponse.error('Unauthorized Request', 401))
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        const { userId, username, email, role, clientId } = decoded
        req.user = { userId, username, email, role, clientId }
        next()
    } catch (error) {
        logger.error('Error while authenticating user', {
            error: error.message,
            path: req.path
        })

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json(AppResponse.error('Token Expired', 401))
        }

        return res.status(401).json(AppResponse.error('Unauthorized Request', 401))
    }
}

export default authenticate