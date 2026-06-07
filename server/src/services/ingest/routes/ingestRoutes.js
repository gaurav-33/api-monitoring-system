import express from "express";
import ingestContainer from "../dependencies/dependencies.js"
import validateApiKey from "../../../shared/middlewares/validateApiKey.js";
import rateLimit from "express-rate-limit";
import config from "../../../shared/config/index.js";

const router = express.Router()

const { ingestController } = ingestContainer.controllers

const ingestLimitter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
        success: false,
        message: 'Too many requests, please try again later',
        statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false
})

router.post('/',
    validateApiKey,
    ingestLimitter,
    (req, res, next) => ingestController.ingestHit(req, res, next)
)

export default router