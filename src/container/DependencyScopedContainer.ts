import { Binding } from '../binding/Binding.js';
import { DependencyContainer } from './DependencyContainer.js';
import { IDependencyContainer } from './IDependencyContainer.js';
import { Token } from '../binding/Binding.js';

export class DependencyScopedContainer extends DependencyContainer {
    constructor(bindings: Map<Token<any>, Binding<any>>, parent: DependencyContainer) {
        super(bindings, parent);
    }

    createScope(): IDependencyContainer {
        return new DependencyScopedContainer(this.bindings, this.getRoot());
    }
}
