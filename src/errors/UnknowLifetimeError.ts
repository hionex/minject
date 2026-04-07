export class UnknownLifetimeError extends Error {
    constructor(lifetime: unknown, message?: string) {
        super(message || `Unknown lifetime: ${String(lifetime)}`);
        this.name = 'UnknownLifetimeError';
    }
}
