/**
 * AppError to handle any error in app 
 */
class AppError extends Error {
    constructor(message, statusCode = 500, error = null) {
        super(message)
        this.statusCode = statusCode
        this.error = error,
            this.isOperational = true
        Error.captureStackTrace(this, this.constructor)
    }
}

export default AppError;