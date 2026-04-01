export class Factory<T, K> {
    private constructor(private readonly fn: (container: K) => T | Promise<T>) {}

    create(container: K): T | Promise<T> {
        return this.fn(container);
    }

    static sync<T, K>(fn: (container: K) => T): Factory<T, K> {
        return new Factory(fn);
    }

    static async<T, K>(fn: (container: K) => Promise<T>): Factory<T, K> {
        return new Factory(fn);
    }

    static from<T, K>(fn: (container: K) => T | Promise<T>): Factory<T, K> {
        return new Factory(fn);
    }
}
