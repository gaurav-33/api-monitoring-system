import mongoose from "mongoose";

/**
 * User Schema with different role
 */
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        trim: true,
        minLength: 3,
        required: true,
        validate: {
            validator: function (username) {
                return /^[a-zA-Z0-9_-]+$/.test(username)
            },
            message: "Please enter a valid username"
        }
    },
    email: {
        type: String,
        unique: true,
        trim: true,
        required: true,
        lowercase: true,
        validate: {
            validator: function (username) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)
            },
            message: "Please enter a valid email"
        }
    },
    password: {
        type: String,
        required: true,
        minLength: 6,
        trim: true,
        validate: {
            validator: function (password) {
                if (this.isModified('password') && password && !password.startsWith('$2b$')) {
                    const validation = SecurityUtils.validatePassword(password)
                    return validation.success
                }
                return true
            },
            message: function (props) {
                if (props.value && !props.value.startsWith('$2b$')) {
                    const validation = SecurityUtils.validatePassword(props.value)
                    return validation.errors.join(', ')
                }
                return 'Please enter a valid password'
            }
        }
    },
    role: {
        type: String,
        enum: ['super_admin', 'client_admin', 'client_viewer'],
        default: 'client_viewer'
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        required: function () {
            return this.role !== 'super_admin'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    permissions: {
        canCreateApiKeys: {
            type: Boolean,
            default: false
        },
        canManageUsers: {
            type: Boolean,
            default: false
        },
        canViewAnalytics: {
            type: Boolean,
            default: true
        },
        canExportData: {
            type: Boolean,
            default: false
        }
    },
}, {
    timestamps: true,
    collection: 'users'
})

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next()
    }
    try {
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(this.password, salt)
        this.password = hashedPassword
        next()
    } catch (error) {
        next(error)
    }
})

userSchema.index({ clientId: 1, isActive: 1 })
userSchema.index({ role: 1 })

const User = mongoose.model('User', userSchema)

export default User