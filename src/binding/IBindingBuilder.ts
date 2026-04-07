import { Constructor, Key } from '@/token/Token.js';
import { Binding } from './Binding.js';

export interface IBindingBuilder<T, K> {
    bind(key: Key<T>): IBindingBuilder<T, K>;
    toValue(value: T): IBindingBuilder<T, K>;
    toClass(ctor: Constructor<T>): IBindingBuilder<T, K>;
    toFactory(factory: (container: K) => T | Promise<T>): IBindingBuilder<T, K>;
    asSingleton(): IBindingBuilder<T, K>;
    asTransient(): IBindingBuilder<T, K>;
    asScoped(): IBindingBuilder<T, K>;
    build(): Binding<T, K>;
}
