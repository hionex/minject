import { Factory } from '@/factory/Factory.js';
import { Token } from '@/token/Token.js';

export enum Lifetime {
    Singleton = 'singleton',
    Transient = 'transient',
    Scoped = 'scoped',
}

export class Binding<T, K> {
    constructor(
        public readonly key: Token<T>,
        public readonly lifetime: Lifetime,
        public readonly factory: Factory<T, K>
    ) {}
}
