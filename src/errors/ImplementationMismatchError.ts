export class ImplementationMismatchError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ImplementationMismatchError';
    }
}
