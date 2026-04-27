import { BindingKeyNotFoundError } from '@/errors/BindingKeyNotFoundError.js';
import { ImplementationNotFoundError } from '@/errors/ImplementationNotFoundError.js';
import { Factory, FactoryBuilder } from '@/factory/Factory.js';
import { Constructor, Key, Token } from '@/token/Token.js';
import { Binding, Lifetime } from './Binding.js';
import { IBindingBuilder } from './IBindingBuilder.js';

export class BindingBuilder<T, K> implements IBindingBuilder<T, K> {
    private _key!: Token<T>;
    private _lifetime!: Lifetime;
    private _factory!: Factory<T, K>;
    private _dependencies: Token<unknown>[] = [];

    public bind(key: Key<T>): IBindingBuilder<T, K> {
        if (key instanceof Token) {
            this._key = key;
        } else if (typeof key === 'function') {
            this._key = Token.fromClass(key);
        } else {
            this._key = Token.for(key);
        }
        return this;
    }

    public toValue(value: T): IBindingBuilder<T, K> {
        this._factory = FactoryBuilder.sync(() => value);
        return this;
    }

    public toClass(ctor: Constructor<T>): IBindingBuilder<T, K> {
        this._factory = FactoryBuilder.sync((container: K) => new ctor(container));
        return this;
    }

    public toFactory(factory: (container: K) => T | Promise<T>): IBindingBuilder<T, K> {
        this._factory = FactoryBuilder.from(factory);
        return this;
    }

    public toAsyncFactory(factory: (container: K) => Promise<T>): IBindingBuilder<T, K> {
        this._factory = FactoryBuilder.async(factory);
        return this;
    }

    public dependsOn(keys: Key<unknown>[]): IBindingBuilder<T, K> {
        this._dependencies = keys.map(key => {
            if (key instanceof Token) {
                return key;
            } else if (typeof key === 'function') {
                return Token.fromClass(key);
            } else {
                return Token.for(key);
            }
        });
        return this;
    }

    public asSingleton(): IBindingBuilder<T, K> {
        this._lifetime = Lifetime.Singleton;
        return this;
    }

    public asTransient(): IBindingBuilder<T, K> {
        this._lifetime = Lifetime.Transient;
        return this;
    }

    public asScoped(): IBindingBuilder<T, K> {
        this._lifetime = Lifetime.Scoped;
        return this;
    }

    public build(): Binding<T, K> {
        this._validate();

        return new Binding<T, K>(this._key, this._lifetime, this._factory, this._dependencies);
    }

    private _validate(): void {
        if (!this._key) {
            throw new BindingKeyNotFoundError('Binding key is required');
        }
        if (!this._factory) {
            throw new ImplementationNotFoundError('Implementation is required');
        }
        if (!this._lifetime) {
            this._lifetime = Lifetime.Transient;
        }
    }
}
