import AppResponse from "../utils/appResponse.js";


const authorize = (allowedRoles = []) => (req, res, next) => {
    try {
        if (!req.user || !req.user.role) {
            return res.status(403).json(AppResponse.error('Access Denied', 403))
        }
        if (allowedRoles.length === 0) {
            next()
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json(AppResponse.error('Insufficient Permissions', 403))
        }
        next()
    } catch (error) {
        return res.status(403).json(AppResponse.error('Access Denied', 403))
    }
}

export default authorize