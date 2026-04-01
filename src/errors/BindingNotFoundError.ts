import { TokenIdentifier } from '@/token/Token.js';

export class BindingNotFoundError extends Error {
    constructor(key: TokenIdentifier) {
        super(`Binding not found for key: ${String(key)}`);
        this.name = 'BindingNotFoundError';
    }
}
