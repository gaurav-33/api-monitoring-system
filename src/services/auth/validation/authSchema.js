import { isValidRole } from "../../../shared/constant/roles.js"

const onboardingSuperAdminSchema = {
    username: {
        required: true,
        minLength: 3,
        maxLength: 20
    },
    email: {
        required: true,
        minLength: 3,
        maxLength: 20
    },
    password: {
        required: true,
        minLength: 8,
        maxLength: 20
    }
}

const registrationSchema = {
    username: {
        required: true,
        minLength: 3,
        maxLength: 20
    },
    email: {
        required: true,
        minLength: 3,
        maxLength: 20
    },
    password: {
        required: true,
        minLength: 6,
        maxLength: 20
    },
    role: {
        required: false,
        custom: (value) => {
            if (!value) return null
            return isValidRole(value) ? null : 'Invalid Role'
        }
    }
}

const loginSchema = {
    username: {
        required: true,
        minLength: 3,
        maxLength: 20
    },
    password: {
        required: true,
        minLength: 6,
        maxLength: 20
    }
}

export {
    onboardingSuperAdminSchema,
    registrationSchema,
    loginSchema
}