import { Binding } from '../binding/Binding.js';
import { Lifetime } from '../binding/Lifetime.js';
import { DependencyContainer } from './DependencyContainer.js';
import { DependencyScopedContainer } from './DependencyScopedContainer.js';
import { IDependencyContainer } from './IDependencyContainer.js';
import { Token } from '../binding/Binding.js';

export class DependencyRootedContainer extends DependencyContainer {
    constructor(bindings: Map<Token<any>, Binding<any>>) {
        super(bindings, null);
    }

    createScope(): IDependencyContainer {
        return new DependencyScopedContainer(this.bindings, this);
    }
}
