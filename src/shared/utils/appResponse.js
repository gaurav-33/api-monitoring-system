/**
 * AppResponse for sending response to client side in structured way
 */
class AppResponse {
    static success(data = null, message = 'Success', statusCode = 200) {
        return {
            success: true,
            data,
            message,
            statusCode
        }
    }

    static error(error = null, message = 'Error', statusCode = 500) {
        return {
            success: false,
            error,
            message,
            statusCode
        }
    }

    static validationError(error = null) {
        return {
            success: false,
            error,
            message: 'Validation Error',
            statusCode: 400
        }
    }

    static paginatedSuccess(data = null, page, limit, total, message = 'Success') {
        return {
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            message,
            statusCode: 200
        }
    }
}

export default AppResponse;