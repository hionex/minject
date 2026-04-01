import { BindingBuilder } from '@/binding/BindingBuilder.js';
import { BindingRegistry } from '@/binding/BindingRegistry.js';
import { DependencyContainer } from './DependencyContainer.js';
import { IDependencyContainer } from './IDependencyContainer.js';

export type RegisterAction<T, K> = (builder: BindingBuilder<T, K>) => void;

export class ContainerBuilder {
    private readonly _registry: BindingRegistry<IDependencyContainer> =
        new BindingRegistry<IDependencyContainer>();

    public register<T>(action: RegisterAction<T, IDependencyContainer>): ContainerBuilder {
        const builder = new BindingBuilder<T, IDependencyContainer>();

        action(builder);

        this._registry.register(builder.build());
        return this;
    }

    public build(): IDependencyContainer {
        this._validateBindings();

        return new DependencyContainer(this._registry);
    }

    private _validateBindings(): void {}
}
