import { Binding, Lifetime } from '@/binding/Binding.js';
import { IBindingRegistry } from '@/binding/IBindingRegistry.js';
import { IDependencyContainer } from '@/container/IDependencyContainer.js';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError.js';
import { Key, Token, TokenIdentifier } from '@/token/Token.js';

export class DependencyContainer implements IDependencyContainer {
    private readonly _singletons: Map<TokenIdentifier, unknown>;
    private readonly _scoped: Map<TokenIdentifier, unknown>;

    constructor(
        protected registry: IBindingRegistry<IDependencyContainer>,
        protected parent: DependencyContainer | null = null
    ) {
        this._singletons = new Map<TokenIdentifier, unknown>();
        this._scoped = new Map<TokenIdentifier, unknown>();
    }

    async resolve<T>(key: Key<T>): Promise<T> {
        const token = this._convertToken(key);
        const binding = this.registry.resolve(token);

        if (!binding) {
            throw new BindingNotFoundError(token.identifier);
        }

        switch (binding.lifetime) {
            case Lifetime.Singleton:
                return this._resolveSingleton(binding);
            case Lifetime.Transient:
                return this._resolveTransient(binding);
            case Lifetime.Scoped:
                return this._resolveScoped(binding);
            default:
                throw new Error(`Unknown lifetime: ${binding.lifetime}`);
        }
    }

    resolveAll<T>(key: Key<T>): Promise<T[]> {
        throw new Error('Method not implemented.');
    }

    createScope(): IDependencyContainer {
        return new DependencyContainer(this.registry, this.getRoot());
    }

    dispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    protected getRoot(): DependencyContainer {
        if (this.parent === null) {
            return this;
        }
        return this.parent.getRoot();
    }

    private _convertToken<T>(key: Key<T>): Token<T> {
        if (key instanceof Token) {
            return key;
        } else if (typeof key === 'function') {
            return Token.fromClass(key);
        } else {
            return Token.for(key);
        }
    }

    private async _resolveInstance<T>(binding: Binding<T, IDependencyContainer>): Promise<T> {
        if (binding.factory) {
            return binding.factory.create(this);
        }

        throw new Error(`No factory found for key: ${String(binding.key.identifier)}`);
    }

    private async _resolveSingleton<T>(binding: Binding<T, IDependencyContainer>): Promise<T> {
        const parent = this.getRoot();
        const instance = parent._singletons.get(binding.key.identifier);
        if (instance) {
            return instance as T;
        }

        const resolved = await this._resolveInstance(binding);
        parent._singletons.set(binding.key.identifier, resolved);
        return resolved;
    }

    private async _resolveTransient<T>(binding: Binding<T, IDependencyContainer>): Promise<T> {
        const resolved = await this._resolveInstance(binding);
        return resolved;
    }

    private async _resolveScoped<T>(binding: Binding<T, IDependencyContainer>): Promise<T> {
        const instance = this._scoped.get(binding.key.identifier);
        if (instance) {
            return instance as T;
        }

        const resolved = await this._resolveInstance(binding);
        this._scoped.set(binding.key.identifier, resolved);
        return resolved;
    }
}
