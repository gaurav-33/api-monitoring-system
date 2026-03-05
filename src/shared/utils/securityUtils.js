class SecurityUtils {
    static PASSWORD_REQUIREMENTS = {
        minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
        requireUpperCase: (process.env.PASSWORD_REQUIRE_UPPER_CASE || 'true') === 'true',
        requireLowerCase: (process.env.PASSWORD_REQUIRE_LOWER_CASE || 'true') === 'true',
        requireNumbers: (process.env.PASSWORD_REQUIRE_NUMBERS || 'true') === 'true',
        requireSpecialCharacters: (process.env.PASSWORD_REQUIRE_SPECIAL_CHARACTERS || 'true') === 'true'
    }

    

    static validatePassword(password) {
        const errors = []
        const requirements = this.PASSWORD_REQUIREMENTS

        if (!password) {
            return {
                success: false,
                errors: ['Password is required']
            }
        }
        if (password.length < requirements.minLength) {
            errors.push(`Password must be at least ${requirements.minLength} characters long`)
        }
        if (requirements.requireUpperCase && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter')
        }
        if (requirements.requireLowerCase && !/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter')
        }
        if (requirements.requireNumbers && !/\d/.test(password)) {
            errors.push('Password must contain at least one number')
        }
        if (requirements.requireSpecialCharacters && !/[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(password)) {
            errors.push('Password must contain at least one special character')
        }

        // common passwords
        const commonPasswords = [
            'password', '123456', 'qwerty',
            'admin', 'password123', 'welcome'
        ]
        if (commonPasswords.includes(password.toLowerCase())) {
            errors.push('Password is too common')
        }

        return {
            success: errors.length === 0,
            errors
        }
    }
}