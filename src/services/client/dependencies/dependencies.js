import MongoApiKeyRepository from "../repository/apiKeyRepository.js"
import MongoClientRepository from "../repository/clientRepository.js"
import MongoUserRepository from "../../auth/repository/userRepository.js"
import { ClientService } from "../service/clientService.js"
import { ClientController } from "../controller/clientController.js"
import authContainer from "../../auth/dependencies/dependencies.js"

class Container {
    static init() {
        const repositories = {
            clientRepository: MongoClientRepository,
            apiKeyRepository: MongoApiKeyRepository,
            userRepository: MongoUserRepository
        }
        const services = {
            clientService: new ClientService({
                clientRepository: repositories.clientRepository,
                apiKeyRepository: repositories.apiKeyRepository,
                userRepository: repositories.userRepository
            }),

            apiKeyServices: {}
        }
        const controllers = {
            clientController: new ClientController(services.clientService, authContainer.services.authService)
        }
        return {
            repositories,
            services,
            controllers
        }
    }
}

const initialized = Container.init()
export { Container }
export default initialized