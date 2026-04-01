export type Constructor<T = object> = new (...args: unknown[]) => T;

export type Key<T> = Token<T> | Constructor<T> | string;

export type TokenIdentifier = symbol;

export class Token<T> {
    private readonly _type!: T;

    readonly identifier: TokenIdentifier;

    private constructor(public readonly description: string) {
        this.identifier = Symbol(description);
    }

    static for<T>(description: string): Token<T> {
        return new Token<T>(description);
    }

    private static cache = new WeakMap<Function, Token<unknown>>();

    static fromClass<T>(ctor: Constructor<T>): Token<T> {
        if (!Token.cache.has(ctor)) {
            Token.cache.set(ctor, new Token<T>(ctor.name));
        }
        return Token.cache.get(ctor) as Token<T>;
    }
}
