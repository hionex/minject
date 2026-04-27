/**
 * Base factory type — union of SyncFactory and AsyncFactory.
 * Used as the stored type in Binding.
 */
export type Factory<T, K> = SyncFactory<T, K> | AsyncFactory<T, K>;

/**
 * Synchronous factory — `create()` returns `T` directly.
 */
export class SyncFactory<T, K> {
    public readonly isAsync = false as const;

    constructor(private readonly fn: (container: K) => T) {}

    create(container: K): T {
        return this.fn(container);
    }
}

/**
 * Asynchronous factory — `create()` returns `Promise<T>`.
 */
export class AsyncFactory<T, K> {
    public readonly isAsync = true as const;

    constructor(private readonly fn: (container: K) => Promise<T>) {}

    create(container: K): Promise<T> {
        return this.fn(container);
    }
}

/**
 * Static helper to construct factories.
 * Preserves the familiar `Factory.sync()` / `Factory.async()` / `Factory.from()` API.
 */
export const FactoryBuilder = {
    sync<T, K>(fn: (container: K) => T): SyncFactory<T, K> {
        return new SyncFactory(fn);
    },

    async<T, K>(fn: (container: K) => Promise<T>): AsyncFactory<T, K> {
        return new AsyncFactory(fn);
    },

    /**
     * Auto-detect factory — treated as sync at registration time.
     * If it returns a Promise at runtime, the container's `get()` will catch it.
     */
    from<T, K>(fn: (container: K) => T | Promise<T>): SyncFactory<T, K> {
        return new SyncFactory(fn as (container: K) => T);
    },
} as const;
