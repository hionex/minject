import { Key } from '@/token/Token.js';

export interface IDependencyContainer {
    // Sync API — throws AsyncBindingError if binding is async
    get<T>(key: Key<T>): T;
    getAll<T>(key: Key<T>): T[];

    // Async API — works for both sync and async bindings
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

