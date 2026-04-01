import { Token, TokenIdentifier } from '@/token/Token.js';
import { Binding } from './Binding.js';
import { IBindingRegistry } from './IBindingRegistry.js';

export class BindingRegistry<K> implements IBindingRegistry<K> {
    private _bindings: Map<TokenIdentifier, Binding<any, K>[]>;

    constructor() {
        this._bindings = new Map<TokenIdentifier, Binding<any, K>[]>();
    }
    register<T>(binding: Binding<T, K>): void {
        const bindings = this._bindings.get(binding.key.identifier);
        if (bindings) {
            bindings.push(binding);
        } else {
            this._bindings.set(binding.key.identifier, [binding]);
        }
    }
    resolve<T>(key: Token<T>): Binding<T, K> | undefined {
        return this._bindings.get(key.identifier)?.at(-1); // last binding wins
    }
    resolveAll<T>(key: Token<T>): Binding<T, K>[] {
        return this._bindings.get(key.identifier) || []; // return all bindings for the key
    }
}
