import { Binding, Lifetime } from '@/binding/Binding.js';
import { IBindingRegistry } from '@/binding/IBindingRegistry.js';
import { IDependencyContainer } from '@/container/IDependencyContainer.js';
import { AsyncBindingError } from '@/errors/AsyncBindingError.js';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError.js';
import { FrozenContainerError } from '@/errors/FrozenContainerError.js';
import { ImplementationNotFoundError } from '@/errors/ImplementationNotFoundError.js';
import { UnknownLifetimeError } from '@/errors/UnknowLifetimeError.js';
import { IDisposable } from '@/lifecycle/IDisposable.js';
import { Key, Token, TokenIdentifier } from '@/token/Token.js';

function isDisposable(instance: any): instance is IDisposable {
    return instance && typeof instance.dispose === 'function';
}

function isPromise<T>(value: unknown): value is Promise<T> {
    return (
        !!value &&
        (typeof value === 'object' || typeof value === 'function') &&
        typeof (value as any).then === 'function'
    );
}

export class DependencyContainer implements IDependencyContainer {
    private readonly _instances: Map<TokenIdentifier, unknown>;
    private readonly _inflight: Map<TokenIdentifier, Promise<unknown>>;
    private readonly _disposables: IDisposable[] = [];
    private readonly _childScopes: Set<IDependencyContainer> = new Set();
    private _isFrozen: boolean = false;

    constructor(
        protected registry: IBindingRegistry<IDependencyContainer>,
        protected parent: DependencyContainer | null = null
    ) {
        this._instances = new Map<TokenIdentifier, unknown>();
        this._inflight = new Map<TokenIdentifier, Promise<unknown>>();
    }

    // ──────────────────────────────────────────────
    // Sync API
    // ──────────────────────────────────────────────

    get<T>(key: Key<T>): T {
        const token = this._convertToken(key);
        const binding = this.registry.resolve(token);

        if (!binding) {
            throw new BindingNotFoundError(token.identifier);
        }

        switch (binding.lifetime) {
            case Lifetime.Singleton:
                return this._getSingleton(binding);
            case Lifetime.Transient:
                return this._getTransient(binding);
            case Lifetime.Scoped:
                return this._getScoped(binding);
            default:
                throw new UnknownLifetimeError(binding.lifetime);
        }
    }

    getAll<T>(key: Key<T>): T[] {
        const token = this._convertToken(key);
        const bindings = this.registry.resolveAll(token);

        return bindings.map(binding => {
            switch (binding.lifetime) {
                case Lifetime.Singleton:
                    return this._getSingleton(binding);
                case Lifetime.Transient:
                    return this._getTransient(binding);
                case Lifetime.Scoped:
                    return this._getScoped(binding);
                default:
                    throw new UnknownLifetimeError(binding.lifetime);
            }
        });
    }

    // ──────────────────────────────────────────────
    // Async API
    // ──────────────────────────────────────────────

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

    // ──────────────────────────────────────────────
    // Scope & Lifecycle
    // ──────────────────────────────────────────────

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
        this._instances.clear();
        this._inflight.clear();
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

    // ──────────────────────────────────────────────
    // Private: Token conversion
    // ──────────────────────────────────────────────

    private _convertToken<T>(key: Key<T>): Token<T> {
        if (key instanceof Token) {
            return key;
        } else if (typeof key === 'function') {
            return Token.fromClass(key);
        } else {
            return Token.for(key);
        }
    }

    // ──────────────────────────────────────────────
    // Private: Sync resolution
    // ──────────────────────────────────────────────

    private _createInstanceSync<T>(binding: Binding<T, IDependencyContainer>): T {
        if (!binding.factory) {
            throw new ImplementationNotFoundError();
        }

        if (binding.isAsync) {
            throw new AsyncBindingError(binding.key.identifier);
        }

        const result = binding.factory.create(this);

        if (isPromise(result)) {
            throw new AsyncBindingError(binding.key.identifier);
        }

        if (isDisposable(result)) {
            this._disposables.push(result);
        }

        return result;
    }

    private _getSingleton<T>(binding: Binding<T, IDependencyContainer>): T {
        const root = this.getRoot();
        const cached = root._instances.get(binding.key.identifier);
        if (cached !== undefined) {
            return cached as T;
        }

        if (root._isFrozen) {
            throw new FrozenContainerError();
        }

        const instance = this._createInstanceSync(binding);
        root._instances.set(binding.key.identifier, instance);
        return instance;
    }

    private _getTransient<T>(binding: Binding<T, IDependencyContainer>): T {
        if (this._isFrozen) {
            throw new FrozenContainerError();
        }
        return this._createInstanceSync(binding);
    }

    private _getScoped<T>(binding: Binding<T, IDependencyContainer>): T {
        const cached = this._instances.get(binding.key.identifier);
        if (cached !== undefined) {
            return cached as T;
        }

        if (this._isFrozen) {
            throw new FrozenContainerError();
        }

        const instance = this._createInstanceSync(binding);
        this._instances.set(binding.key.identifier, instance);
        return instance;
    }

    // ──────────────────────────────────────────────
    // Private: Async resolution
    // ──────────────────────────────────────────────

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

    private _resolveSingleton<T>(binding: Binding<T, IDependencyContainer>): Promise<T> {
        const root = this.getRoot();

        // 1. Already resolved?
        const cached = root._instances.get(binding.key.identifier);
        if (cached !== undefined) {
            return Promise.resolve(cached as T);
        }

        // 2. In-flight promise? (race condition protection)
        const inflight = root._inflight.get(binding.key.identifier);
        if (inflight) {
            return inflight as Promise<T>;
        }

        if (root._isFrozen) {
            throw new FrozenContainerError();
        }

        // 3. Create and cache promise immediately
        const promise = this._resolveInstance(binding)
            .then(instance => {
                root._instances.set(binding.key.identifier, instance);
                root._inflight.delete(binding.key.identifier);
                return instance;
            })
            .catch(err => {
                root._inflight.delete(binding.key.identifier);
                throw err;
            });

        root._inflight.set(binding.key.identifier, promise);
        return promise;
    }

    private async _resolveTransient<T>(binding: Binding<T, IDependencyContainer>): Promise<T> {
        if (this._isFrozen) {
            throw new FrozenContainerError();
        }
        return this._resolveInstance(binding);
    }

    private _resolveScoped<T>(binding: Binding<T, IDependencyContainer>): Promise<T> {
        // 1. Already resolved?
        const cached = this._instances.get(binding.key.identifier);
        if (cached !== undefined) {
            return Promise.resolve(cached as T);
        }

        // 2. In-flight promise? (race condition protection)
        const inflight = this._inflight.get(binding.key.identifier);
        if (inflight) {
            return inflight as Promise<T>;
        }

        if (this._isFrozen) {
            throw new FrozenContainerError();
        }

        // 3. Create and cache promise immediately
        const promise = this._resolveInstance(binding)
            .then(instance => {
                this._instances.set(binding.key.identifier, instance);
                this._inflight.delete(binding.key.identifier);
                return instance;
            })
            .catch(err => {
                this._inflight.delete(binding.key.identifier);
                throw err;
            });

        this._inflight.set(binding.key.identifier, promise);
        return promise;
    }
}
