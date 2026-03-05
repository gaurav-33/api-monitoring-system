import mongoose from "mongoose";

/**
 * Client Schema
 */
const clientSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        trim: true,
        minLength: 3,
        maxLength: 100,
        required: true,
    },
    slug: {
        type: String,
        unique: true,
        trim: true,
        minLength: 3,
        required: true,
        match: /^[a-zA-Z0-9-]+$/,
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
    description: {
        type: String,
        default: '',
        maxLength: 500
    },
    isActive: {
        type: Boolean,
        default: true
    },
    website: {
        type: String,
        default: '',
        maxLength: 500

    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    settings: {
        dataRetentionDays: {
            type: Number,
            default: 30,
            min: 5,
            max: 365,
        },
        alertsEnabled: {
            type: Boolean,
            default: true,
        },
        timezone: {
            type: String,
            default: 'UTC',
        }
    }
}, {
    timestamps: true,
    collection: 'clients'
})

clientSchema.index({ isActive: 1 })

const Client = mongoose.model('Client', clientSchema)

export default Client