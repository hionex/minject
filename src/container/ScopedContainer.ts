import { IBindingRegistry } from '@/binding/IBindingRegistry.js';
import { DependencyContainer } from '@/container/DependencyContainer.js';
import { IDependencyContainer } from './IDependencyContainer.js';

export class ScopedContainer extends DependencyContainer {
    constructor(
        protected registry: IBindingRegistry<IDependencyContainer>,
        protected parent: DependencyContainer
    ) {
        super(registry, parent);
    }

    public createScope(): IDependencyContainer {
        return new ScopedContainer(this.registry, this.getRoot());
    }
}
