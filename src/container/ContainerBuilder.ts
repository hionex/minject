import { Binding } from '../binding/Binding.js';
import { BindingBuilder } from '../binding/BindingBuilder.js';
import { Lifetime } from '../binding/Lifetime.js';
import { IDependencyContainer } from './IDependencyContainer.js';
import { DependencyRootedContainer } from './DependencyRootedContainer.js';
import { Token } from '../binding/Binding.js';

export type RegisterAction<T> = (builder: BindingBuilder<T>) => void;

export class ContainerBuilder {
    private readonly _bindings: Map<Token<any>, Binding<any>> = new Map();

    public register<T>(action: RegisterAction<T>): ContainerBuilder {
        const builder = new BindingBuilder<T>();

        action(builder);

        const binding = builder.build();

        this._bindings.set(binding.key, binding);

        return this;
    }

    public build(): IDependencyContainer {
        this._validateBindings();

        return new DependencyRootedContainer(this._bindings);
    }

    private _validateBindings(): void {
        const transientTokens = new Set<Token<any>>();

        // Collect all Transient bindings first
        for (const [key, binding] of this._bindings) {
            if (binding.lifetime === Lifetime.Transient) {
                transientTokens.add(key);
            }
        }

        // Check if Scoped/Singleton depends on Transient
        for (const [key, binding] of this._bindings) {
            if (binding.lifetime === Lifetime.Transient) {
                continue; // Skip Transient itself
            }

            // Check if this Scoped/Singleton binding has a factory
            // that depends on Transient dependencies
            if (binding.factory) {
                // Factory captures the container - we can't easily introspect it
                // So we warn about the pattern: Scoped/Singleton + factory with dependencies
                if (binding.lifetime === Lifetime.Scoped || binding.lifetime === Lifetime.Singleton) {
                    // This is a potential issue: factory resolves dependencies at construction time
                    // If those dependencies are Transient, they become "captive" - held by the cached instance
                    console.warn(
                        `[minject] Potential captive dependency detected:` +
                        ` ${key.toString()} (${binding.lifetime}) uses a factory ` +
                        `that may resolve Transient dependencies. ` +
                        `Use resolveFactory() for truly transient dependencies in Scoped/Singleton services.`
                    );
                }
            }
        }
    }
}
