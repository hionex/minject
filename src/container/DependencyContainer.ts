import { Binding, Lifetime } from '@/binding/Binding.js';
import { IBindingRegistry } from '@/binding/IBindingRegistry.js';
import { IDependencyContainer } from '@/container/IDependencyContainer.js';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError.js';
import { FrozenContainerError } from '@/errors/FrozenContainerError.js';
import { ImplementationNotFoundError } from '@/errors/ImplementationNotFoundError.js';
import { UnknownLifetimeError } from '@/errors/UnknowLifetimeError.js';
import { IDisposable } from '@/lifecycle/IDisposable.js';
import { Key, Token, TokenIdentifier } from '@/token/Token.js';

function isDisposable(instance: any): instance is IDisposable {
    return instance && typeof instance.dispose === 'function';
}

export class DependencyContainer implements IDependencyContainer {
    private readonly _singletons: Map<TokenIdentifier, unknown>;
    private readonly _scoped: Map<TokenIdentifier, unknown>;
    private readonly _disposables: IDisposable[] = [];
    private readonly _childScopes: Set<IDependencyContainer> = new Set();
    private _isFrozen: boolean = false;

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
                throw new UnknownLifetimeError(binding.lifetime);
        }
    }

    async resolveAll<T>(key: Key<T>): Promise<T[]> {
        const token = this._convertToken(key);
        const bindings = this.registry.resolveAll(token);

        return Promise.all(
            bindings.map(binding => {
                switch (binding.lifetime) {
                    case Lifetime.Singleton:
                        return this._resolveSingleton(binding);
                    case Lifetime.Transient:
                        return this._resolveTransient(binding);
                    case Lifetime.Scoped:
                        return this._resolveScoped(binding);
                    default:
                        throw new UnknownLifetimeError(binding.lifetime);
                }
            })
        );
    }

    createScope(): IDependencyContainer {
        const scope = new DependencyContainer(this.registry, this.getRoot());
        this._childScopes.add(scope);
        return scope;
    }

    async dispose(): Promise<void> {
        // Dispose child scopes first
        await Promise.all(Array.from(this._childScopes).map(scope => scope.dispose()));
        this._childScopes.clear();

        // Dispose instances in LIFO order
        const disposables = [...this._disposables].reverse();
        for (const disposable of disposables) {
            await disposable.dispose();
        }
        this._disposables.length = 0;

        // Clear instance caches
        this._singletons.clear();
        this._scoped.clear();
    }

    freeze(): void {
        this._isFrozen = true;
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
        if (!binding.factory) {
            throw new ImplementationNotFoundError();
        }

        const instance = await binding.factory.create(this);

        if (isDisposable(instance)) {
            this._disposables.push(instance);
        }

        return instance;
    }

    private async _resolveSingleton<T>(binding: Binding<T, IDependencyContainer>): Promise<T> {
        const parent = this.getRoot();
        const instance = parent._singletons.get(binding.key.identifier);
        if (instance) {
            return instance as T;
        }

        if (parent._isFrozen) {
            throw new FrozenContainerError();
        }

        const resolved = await this._resolveInstance(binding);
        parent._singletons.set(binding.key.identifier, resolved);
        return resolved;
    }

    private async _resolveTransient<T>(binding: Binding<T, IDependencyContainer>): Promise<T> {
        if (this._isFrozen) {
            throw new FrozenContainerError();
        }
        const resolved = await this._resolveInstance(binding);
        return resolved;
    }

    private async _resolveScoped<T>(binding: Binding<T, IDependencyContainer>): Promise<T> {
        const instance = this._scoped.get(binding.key.identifier);
        if (instance) {
            return instance as T;
        }

        if (this._isFrozen) {
            throw new FrozenContainerError();
        }

        const resolved = await this._resolveInstance(binding);
        this._scoped.set(binding.key.identifier, resolved);
        return resolved;
    }
}
