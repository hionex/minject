import { Binding } from '../binding/Binding.js';
import { Lifetime } from '../binding/Lifetime.js';
import { IDependencyContainer } from './IDependencyContainer.js';
import { Token } from '../binding/Binding.js';

export abstract class DependencyContainer implements IDependencyContainer {
    protected instances: Map<Token<any>, any> = new Map();

    constructor(
        protected bindings: Map<Token<any>, Binding<any>>,
        protected parent: DependencyContainer | null = null
    ) {}

    abstract createScope(): IDependencyContainer;

    resolve<T>(key: Token<T>): T {
        const binding = this.bindings.get(key);
        if (!binding) {
            throw new Error(`No binding found for key ${key.toString()}`);
        }

        switch (binding.lifetime) {
            case Lifetime.Singleton:
                return this.resolveSingleton(key, binding);
            case Lifetime.Scoped:
                return this.resolveScoped(key, binding);
            case Lifetime.Transient:
                return this.resolveTransient(key, binding);
            default:
                throw new Error('Invalid lifetime.');
        }
    }

    protected isRoot(): boolean {
        return this.parent === null;
    }

    protected getRoot(): DependencyContainer {
        if (this.isRoot()) {
            return this;
        }
        return this.parent!.getRoot();
    }

    protected resolveSingleton<T>(key: Token<T>, binding: Binding<T>): T {
        return this.getRoot().resolveScoped(key, binding);
    }

    protected resolveScoped<T>(key: Token<T>, binding: Binding<T>): T {
        // Cache Scoped and Singleton lifetimes at this scope level
        // Transient bypasses caching (handled by resolveTransient)
        if (binding.lifetime === Lifetime.Transient) {
            return this._createInstance(binding);
        }

        if (this.instances.has(key)) {
            return this.instances.get(key) as T;
        }

        const instance = this._createInstance(binding);
        this.instances.set(key, instance);
        return instance;
    }

    protected resolveTransient<T>(key: Token<T>, binding: Binding<T>): T {
        return this._createInstance(binding);
    }

    private _createInstance<T>(binding: Binding<T>): T {
        if (binding.factory) {
            return binding.factory(this);
        }

        if (binding.implementation) {
            return new binding.implementation();
        }

        throw new Error('Invalid binding.');
    }

    close(): void {
        this.instances.clear();
    }
}
