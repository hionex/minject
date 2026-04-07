import { DependencyContainer } from './DependencyContainer.js';
import { IDependencyContainer } from './IDependencyContainer.js';
import { IBindingRegistry } from '@/binding/IBindingRegistry.js';
import { IBindingBuilder } from '@/binding/IBindingBuilder.js';
import { BindingRegistry } from '@/binding/BindingRegistry.js';
import { BindingBuilder } from '@/binding/BindingBuilder.js';

export type RegisterAction<T, K> = (builder: IBindingBuilder<T, K>) => void;

export class ContainerBuilder {
    private readonly _registry: IBindingRegistry<IDependencyContainer>;

    constructor(registry?: IBindingRegistry<IDependencyContainer>) {
        this._registry = registry ?? new BindingRegistry<IDependencyContainer>();
    }

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
