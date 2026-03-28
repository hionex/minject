import { IDependencyContainer } from '../container/IDependencyContainer.js';
import { Lifetime } from './Lifetime.js';

export type Token<T = any> = string | symbol | Class<T>;

export type Class<T = any> = new (...args: any[]) => T;

export type Factory<T> = (container: IDependencyContainer) => T;

export class Binding<T> {
    constructor(
        readonly key: Token<T>,
        readonly lifetime: Lifetime,
        readonly implementation: Class<T> | null = null,
        readonly factory: Factory<T> | null = null
    ) {}
}
