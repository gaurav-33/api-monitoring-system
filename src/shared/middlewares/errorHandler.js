import logger from "../config/logger.js"
import AppResponse from "../utils/appResponse.js"

/**
 * Middleware to handle any error without crashing the app
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = req.statusCode || 500
    let message = err.message || 'Internal Server error'
    let errors = err.errors || null

    logger.error('Error Occured: ', {
        message: err.message,
        statusCode,
        stack: err.stack,
        path: req.path,
        method: req.method
    })

    if (err.name === 'ValidationError') {
        statusCode = 400
        message = 'Validation Error'
        errors = Object.values(err.errors).map((e) => e.message)
    } else if (err.name === 'MongoServerError' && err.code === 11000) {
        statusCode = 409
        message = 'Duplicate Key Error'
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401
        message = 'Invalid Token'
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401
        message = 'Token Expired'
    }

    res.status(statusCode).json(AppResponse.error(errors, message, statusCode))
}

export default errorHandler