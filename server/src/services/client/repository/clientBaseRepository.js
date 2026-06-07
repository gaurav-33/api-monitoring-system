export default class CLientBaseRepository{
    constructor(model){
        this.model = model
    }

    async create(data) {
        throw new Error('Method not implemented')
    }

    async findById(id){
        throw new Error('Method not implemented')
    }

    async findBySlug(slug){
        throw new Error('Method not implemented')
    }

    async find(filters, options){
        throw new Error('Method not implemented')
    }

    async count(filters){
        throw new Error('Method not implemented')
    }
}