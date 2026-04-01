import { ImplementationMismatchError } from '@/errors/ImplementationMismatchError.js';
import { KeyMismatchError } from '@/errors/KeyMismatchError.js';
import { LifetimeMismatchError } from '@/errors/LifetimeMismatchError.js';
import { Factory } from '@/factory/Factory.js';
import { Constructor, Key, Token } from '@/token/Token.js';
import { Binding, Lifetime } from './Binding.js';

export class BindingBuilder<T, K> {
    private _key!: Token<T>;
    private _lifetime!: Lifetime;
    private _factory!: Factory<T, K>;

    public bind(key: Key<T>): BindingBuilder<T, K> {
        if (key instanceof Token) {
            this._key = key;
        } else if (typeof key === 'function') {
            this._key = Token.fromClass(key);
        } else {
            this._key = Token.for(key as string);
        }
        return this;
    }
    public toValue(value: T): BindingBuilder<T, K> {
        this._factory = Factory.sync(() => value);
        return this;
    }
    public toClass(ctor: Constructor<T>): BindingBuilder<T, K> {
        this._factory = Factory.sync((container: K) => new ctor(container));
        return this;
    }
    public toFactory(factory: (container: K) => T | Promise<T>): BindingBuilder<T, K> {
        this._factory = Factory.from(factory);
        return this;
    }
    public asSingleton(): BindingBuilder<T, K> {
        this._lifetime = Lifetime.Singleton;
        return this;
    }
    public asTransient(): BindingBuilder<T, K> {
        this._lifetime = Lifetime.Transient;
        return this;
    }
    public asScoped(): BindingBuilder<T, K> {
        this._lifetime = Lifetime.Scoped;
        return this;
    }

    public build(): Binding<T, K> {
        this._validate();

        return new Binding(this._key, this._lifetime, this._factory);
    }

    private _validate(): void {
        if (!this._key) {
            throw new KeyMismatchError('Key is not set.');
        }
        if (!this._lifetime) {
            throw new LifetimeMismatchError('Lifetime is not set.');
        }
        if (!this._factory) {
            throw new ImplementationMismatchError('Implementation or factory is not set.');
        }
    }
}
