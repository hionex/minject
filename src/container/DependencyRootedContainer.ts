import { Binding, Token } from '@/binding/Binding.js';
import { DependencyContainer } from '@/container/DependencyContainer.js';
import { DependencyScopedContainer } from '@/container/DependencyScopedContainer.js';
import { IDependencyContainer } from '@/container/IDependencyContainer.js';

export class DependencyRootedContainer extends DependencyContainer {
    constructor(bindings: Map<Token<any>, Binding<any>>) {
        super(bindings, null);
    }

    createScope(): IDependencyContainer {
        return new DependencyScopedContainer(this.bindings, this);
    }
}
