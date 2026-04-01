import { Token } from '@/token/Token.js';
import { Binding } from './Binding.js';

export interface IBindingRegistry<K> {
    register<T>(binding: Binding<T, K>): void;
    resolve<T>(key: Token<T>): Binding<T, K> | undefined;
    resolveAll<T>(key: Token<T>): Binding<T, K>[];
}
