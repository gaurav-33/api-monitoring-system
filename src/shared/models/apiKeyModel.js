import mongoose from "mongoose";
import config from "../config/index.js";

/**
 * API KEY Schema
 */
const apiKeySchema = new mongoose.Schema({
    keyId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    keyValue: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    name: {
        type: String,
        required: true,
        maxLength: 100
    },
    description: {
        type: String,
        default: '',
        maxLength: 500
    },
    isActive: {
        type: Boolean,
        default: true
    },
    environment: {
        type: String,
        enum: ['development', 'testing', 'staging', 'production'],
        default: 'production'
    },
    permissions: {
        canIngest: {
            type: Boolean,
            default: true
        },
        canReadAnalytics: {
            type: Boolean,
            default: false
        },
        allowedServices: [
            {
                type: String,
                trim: true
            }
        ],
    },
    security: {
        allowedIPs: [
            {
                type: String,
                validate: {
                    validator: function (ip) {
                        return /^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)
                    },
                    message: "Please enter a valid IP address"
                }
            }
        ],
        allowedOrigins: [{
            type: String,
            validate: {
                validator: function (origin) {
                    return /^https?:\/\/[^\s]+$/.test(origin) || origin === '*'
                }
            },
            message: "Please enter a valid origin"
        }],
        lastRotated: {
            type: Date,
            default: Date.now
        },
        rotationWarningDays: {
            type: Number,
            default: 30,
            max: 365,
        }
    },
    expiresAt: {
        type: Date,
        default: () => {
            const days = config.apiKey.expiresIn
            return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
        },
        index: true
    },
    metadata: {
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        purpose: {
            type: String,
            trim: true,
            maxLength: 100
        },
        tags: [{ type: String, trim: true, maxLength: 50 }
        ]
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
}, {
    timestamps: true,
    collection: 'api_keys'
})

apiKeySchema.index({ clientId: 1, isActive: 1 })
apiKeySchema.index({ keyValue: 1, isActive: 1 })
apiKeySchema.index({ environment: 1, clientId: 1 })
apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const ApiKey = mongoose.model('ApiKey', apiKeySchema)

export default ApiKey