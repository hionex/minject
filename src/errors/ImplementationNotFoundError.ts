export class ImplementationNotFoundError extends Error {
    constructor(message?: string) {
        super(message || 'Implementation not found');
        this.name = 'ImplementationNotFoundError';
    }
}
