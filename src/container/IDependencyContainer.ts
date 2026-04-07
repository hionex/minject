import { Key } from '@/token/Token.js';

export interface IDependencyContainer {
    resolve<T>(key: Key<T>): Promise<T>;
    resolveAll<T>(key: Key<T>): Promise<T[]>;

    // Scope
    createScope(): IDependencyContainer;

    // Lifecycle
    dispose(): Promise<void>;
    freeze(): void;

    // Inspection
    // getBindings(): BindingInfo[];
    // getStatistics(): ContainerStats;
    // visualize(): string;
}
