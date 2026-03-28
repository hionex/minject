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
import { ContainerBuilder } from 'minject';

const builder = new ContainerBuilder();

builder.register(b => b.bind(Logger).to(Logger).asSingleton());
builder.register(b => b.bind(App).toFactory(c => new App(c.resolve(Logger))));

const container = builder.build();
const app = container.resolve(App);
app.run();
```

## ✨ Key Features

- **Fluent DSL**: Intuitive API for binding implementations and factories.
- **Lifecycle Management**:
    - `Singleton`: One instance per root container.
    - `Scoped`: One instance per scope/depth.
    - `Transient`: New instance for every resolution.
- **Hierarchical Scopes**: Create child containers to manage sub-lifecycles (e.g., per-request scopes in Express).
- **Zero Decorators (for now)**: Manual constructor injection via factories ensures full control and zero "magic."

## 🏗 Directory Structure

```text
src/
├── binding/      # Binding DTOs and Fluent Builder
├── container/    # Container logic and hierarchy
└── index.ts      # Entry point
```

## 🛠 Tech Stack

- **Language**: TypeScript 5.3+
- **Runtime**: Node.js (ESM)
- **Metadata**: `reflect-metadata` (Prepped for future decorator support)

## 🚧 Roadmap

- [ ] Fix transient caching bug.
- [ ] Async `resolve()` and factory support.
- [ ] Decorator-based injection (`@Injectable`, `@Inject`).
- [ ] Circular dependency detection.

## 📜 License

This project is licensed under the [ISC License](LICENSE).
