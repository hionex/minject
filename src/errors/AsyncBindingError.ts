import { TokenIdentifier } from '@/token/Token.js';

export class AsyncBindingError extends Error {
    constructor(key: TokenIdentifier, message?: string) {
        super(
            message ||
                `"${String(key)}" requires async resolution. Use resolve() instead.`
        );
        this.name = 'AsyncBindingError';
    }
}
