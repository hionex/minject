import { Binding, Token } from '@/binding/Binding.js';
import { DependencyContainer } from '@/container/DependencyContainer.js';
import { IDependencyContainer } from '@/container/IDependencyContainer.js';

export class DependencyScopedContainer extends DependencyContainer {
    constructor(bindings: Map<Token<any>, Binding<any>>, parent: DependencyContainer) {
        super(bindings, parent);
    }

    createScope(): IDependencyContainer {
        return new DependencyScopedContainer(this.bindings, this.getRoot());
    }
}
