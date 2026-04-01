export class LifetimeMismatchError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'LifetimeMismatchError';
    }
}
