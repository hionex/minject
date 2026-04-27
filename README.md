# minject 💉

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

`minject` is a lightweight, SOLID-compliant Dependency Injection (DI) library for Node.js and TypeScript. It provides a clean separation of concerns through a fluent builder DSL and a robust container hierarchy.

## 🚀 Quick Start

### 1. Define your services

```typescript
class Logger {
    log(message: string) {
        console.log(message);
    }
}

class App {
    constructor(private logger: Logger) {}
    run() {
        this.logger.log('Hello from minject!');
    }
}
```

### 2. Configure the container

```typescript
import { ContainerBuilder, Token } from 'minject';

const builder = new ContainerBuilder();
const LoggerToken = Token.for<Logger>('Logger');
const AppToken = Token.for<App>('App');

builder.register(b => b.bind(LoggerToken).toClass(Logger).asSingleton());
builder.register(b =>
    b.bind(AppToken).toFactory(c => new App(c.get(LoggerToken)))
);

const container = builder.build();
const app = container.get(AppToken);
app.run();
```

## ✨ Key Features

- **Dual Sync/Async API**: `get()` for synchronous resolution, `resolve()` for async — you choose what fits.
- **Fluent DSL**: Intuitive API for binding implementations and factories.
- **Lifecycle Management**:
    - `Singleton`: One instance per root container.
    - `Scoped`: One instance per scope/depth.
    - `Transient`: New instance for every resolution.
- **Hierarchical Scopes**: Create child containers to manage sub-lifecycles (e.g., per-request scopes in Express).
- **Race-Condition Safe**: Async singletons use Promise memoization to prevent duplicate initialization.
- **Zero Decorators (for now)**: Manual constructor injection via factories ensures full control and zero "magic."

## 🔄 Sync vs Async Resolution

### `get()` — Synchronous

Use when all dependencies in the chain are synchronous:

```typescript
// Sync factory
builder.register(b => b.bind(token).toFactory(() => new MyService()));

const service = container.get(token); // Returns T directly
```

If the binding involves an async factory, `get()` throws `AsyncBindingError` immediately — fail-fast, no surprises.

### `resolve()` — Asynchronous

Use when any dependency requires async initialization (DB connections, config loading, etc.):

```typescript
// Explicit async factory
builder.register(b =>
    b.bind(dbToken).toAsyncFactory(async () => {
        const connection = await connectToDatabase();
        return connection;
    }).asSingleton()
);

const db = await container.resolve(dbToken); // Returns Promise<T>
```

`resolve()` works for both sync and async bindings — it's always safe to use.

### `toFactory()` vs `toAsyncFactory()`

| Method | `isAsync` | `get()` | `resolve()` |
|--------|-----------|---------|-------------|
| `toValue(v)` | `false` | ✅ | ✅ |
| `toClass(C)` | `false` | ✅ | ✅ |
| `toFactory(fn)` | `false`* | ✅* | ✅ |
| `toAsyncFactory(fn)` | `true` | ❌ throws | ✅ |

\* If `toFactory` returns a `Promise` at runtime, `get()` will throw `AsyncBindingError` (auto-detection).

## 🏗 Directory Structure

```text
src/
├── binding/      # Binding DTOs and Fluent Builder
├── container/    # Container logic and hierarchy
├── errors/       # Error classes
├── factory/      # Factory abstraction
├── lifecycle/    # Disposable interface
├── token/        # Token-based DI keys
└── index.ts      # Entry point
```

## 🛠 Tech Stack

- **Language**: TypeScript 5.3+
- **Runtime**: Node.js (ESM)
- **Testing**: Vitest

## 🚧 Roadmap

- [x] Async `resolve()` and factory support.
- [x] Dual sync/async API (`get()` + `resolve()`).
- [x] Race-condition safe singleton resolution.
- [ ] Decorator-based injection (`@Injectable`, `@Inject`).
- [ ] Circular dependency detection.
- [ ] Module system for organizing bindings.

## 📜 License

This project is licensed under the [ISC License](LICENSE).
