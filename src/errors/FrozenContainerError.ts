export class FrozenContainerError extends Error {
    constructor(message?: string) {
        super(message || 'Cannot resolve new instances in a frozen container.');
        this.name = 'FrozenContainerError';
    }
}
