import mongoose from "mongoose";

/**
 * API HITS Schema
 */
const apiHitsSchema = new mongoose.Schema({
    eventId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    timestamp: {
        type: Date,
        required: true
    },
    serviceName: {
        type: String,
        required: true,
        index: true
    },
    endpoint: {
        type: String,
        required: true,
        index: true
    },
    method: {
        type: String,
        required: true,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH']
    },
    statusCode: {
        type: Number,
        required: true,
        index: true
    },
    latencyMs: {
        type: Number,
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    apiKeyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApiKey',
        required: true
    },
    ip: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        default: ''
    }
}, {
    timestamps: true,
    collection: 'api_hits'
})

apiHitsSchema.index({ clientId: 1, serviceName: 1, endpoint: 1, timestamp: -1 })
apiHitsSchema.index({ apiKeyId: 1, timestamp: -1 })
apiHitsSchema.index({ clientId: 1, timestamp: -1, statusCode: 1 })
apiHitsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 })

const ApiHits = mongoose.model('ApiHits', apiHitsSchema)

export default ApiHits;