import { Token } from '@/binding/Binding.js';
import { IAutoCloseable } from '@/container/IAutoCloseable.js';

export interface IDependencyContainer extends IAutoCloseable {
    resolve<T>(key: Token<T>): T;
    resolveFactory<T>(key: Token<T>): () => T;
    createScope(): IDependencyContainer;
}
