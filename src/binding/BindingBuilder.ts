import { Binding, Class, Factory, Token } from './Binding.js';
import { Lifetime } from './Lifetime.js';

export class BindingBuilder<T> {
    private _key!: Token<T>;
    private _lifetime!: Lifetime;
    private _implementation!: Class<T> | null;
    private _factory!: Factory<T> | null;

    public bind(key: Token<T>): BindingBuilder<T> {
        this._key = key;
        return this;
    }
    public to(implementation: Class<T>): BindingBuilder<T> {
        this._implementation = implementation;
        return this;
    }
    public toFactory(factory: Factory<T>): BindingBuilder<T> {
        this._factory = factory;
        return this;
    }
    public asSingleton(): BindingBuilder<T> {
        this._lifetime = Lifetime.Singleton;
        return this;
    }
    public asTransient(): BindingBuilder<T> {
        this._lifetime = Lifetime.Transient;
        return this;
    }
    public asScoped(): BindingBuilder<T> {
        this._lifetime = Lifetime.Scoped;
        return this;
    }

    public build(): Binding<T> {
        this._validate();

        return new Binding(this._key, this._lifetime, this._implementation, this._factory);
    }

    private _validate(): void {
        if (!this._key) {
            throw new Error('Key is not set.');
        }
        if (!this._lifetime) {
            throw new Error('Lifetime is not set.');
        }
        if (!this._implementation && !this._factory) {
            throw new Error('Implementation or factory is not set.');
        }
    }
}
