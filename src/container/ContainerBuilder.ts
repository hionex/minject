import { Binding } from '../binding/Binding.js';
import { BindingBuilder } from '../binding/BindingBuilder.js';
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
        return new DependencyRootedContainer(this._bindings);
    }
}
