/**
 * BaseRepository
 * Database-agnostic repository contract
 */

export class BaseRepository {
    constructor({ logger: l = console } = {}) {
        this.logger = l;
    }

    async save(){
        throw new Error('Method not implemented: save')
    }

    async find(){
        throw new Error('Method not implemented: find')
    }

    async count(){
        throw new Error('Method not implemented: count')
    }

    async deleteOldHits(){
        throw new Error('Method not implemented: deleteOldHits')
    }
}