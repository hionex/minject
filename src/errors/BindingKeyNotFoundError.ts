export class BindingKeyNotFoundError extends Error {
    constructor(message?: string) {
        super(message || 'Binding key not found');
        this.name = 'BindingKeyNotFoundError';
    }
}
