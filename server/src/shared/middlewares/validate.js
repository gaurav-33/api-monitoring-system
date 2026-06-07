import AppResponse from "../utils/appResponse.js";

const validate = (schema) => (req, res, next) => {
    if (!schema) {
        next()
    }

    const errors = []
    const body = req.body || {}

    Object.entries(schema).forEach(([key, rule]) => {
        const bodyValue = body[key]

        if (rule.required && (bodyValue === undefined || bodyValue === null || body === '')) {
            errors.push(`${key} is required`)
        }

        if (rule.minLength && bodyValue && bodyValue.length < rule.minLength && typeof bodyValue === 'string') {
            errors.push(`${key} must be at least ${rule.minLength} characters long`)
        }

        if (rule.maxLength && bodyValue && bodyValue.length > rule.maxLength && typeof bodyValue === 'string') {
            errors.push(`${key} must be at most ${rule.maxLength} characters long`)
        }

        if (rule.custom && typeof rule.custom === 'function') {
            const customError = rule.custom(bodyValue)
            if (customError) {
                errors.push(customError)
            }

        }
    })
    if (errors.length > 0) {
        return res.status(400).json(AppResponse.error(errors, 'Validation Error', 400))
    }
    next()
}

export default validate