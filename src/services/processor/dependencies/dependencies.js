import logger from "../../../shared/config/logger.js"
import postgres from "../../../shared/config/postgres.js"
import ApiHits from "../../../shared/models/apiHitsModel.js"
import { ApiHitRepository } from "../repository/ApiHitRepository.js"
import { MetricsRepository } from "../repository/MetricsRepository.js"
import { ProcessorService } from "../service/ProcessorService.js"

class Container {
    static init() {

        const repositories = {
            apiHitRepository: new ApiHitRepository({ model: ApiHits, logger: logger }),
            metricsRepository: new MetricsRepository({logger: logger, postgres: postgres})
        }
        const services = {
            processorService: new ProcessorService(repositories)
        }

        return {
            repositories,
            services
        }
    }
}

const initialized = Container.init()
export { Container }
export default initialized