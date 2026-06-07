import { createEventProducer } from "../../../shared/events/producer/createEventProducer.js";
import { IngestController } from "../controller/ingestController.js";
import { IngestService } from "../service/ingestService.js";



class Container {
    static init() {
        const eventProducer = createEventProducer();

        const services = {
            ingestService: new IngestService({ eventProducer })
        }

        const controllers = {
            ingestController: new IngestController(services)
        }

        return { services, controllers }
    }
}

const initialized = Container.init()
export { Container }
export default initialized