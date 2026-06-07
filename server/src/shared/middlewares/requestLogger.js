import logger from "../../shared/config/logger.js"


const requestLogger = (req, res, next) => {
    const start = Date.now()

    res.on('finish', () => {
        const duration = Date.now() - start
        logger.info('HTTP Request %s %s %s %dms', req.method, req.url || req.originalUrl, res.ip || req.socket.remoteAddress,
            duration, {
            method: req.method,
            status: res.statusCode,
            path: req.path,
            duration
        })
    })
    next()
}

export default requestLogger
