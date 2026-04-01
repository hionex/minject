# minject — Full Development Roadmap

> A lightweight, SOLID-compliant Dependency Injection library for Node.js / TypeScript.
> This document describes the complete architecture, design decisions, and feature set
> of `minject` from its initial foundation to its production-ready v2.0.0 release.
>
> **Repository:** https://github.com/hiep20012003/minject  
> **Language:** TypeScript 5.3+ · Node.js ESM · Vitest

---

## Table of Contents

- [minject — Full Development Roadmap](#minject--full-development-roadmap)
  - [Table of Contents](#table-of-contents)
  - [1. Design Philosophy](#1-design-philosophy)
  - [2. Architecture Overview](#2-architecture-overview)
  - [3. Feature Set](#3-feature-set)
    - [3.1 Container Hierarchy \& Scopes](#31-container-hierarchy--scopes)
    - [3.2 Binding System \& Fluent DSL](#32-binding-system--fluent-dsl)
    - [3.3 Async Resolution](#33-async-resolution)
      - [Two-phase init](#two-phase-init)
      - [API](#api)
      - [Promise cache for singletons](#promise-cache-for-singletons)
      - [Mixed sync/async chains](#mixed-syncasync-chains)
      - [Async error propagation](#async-error-propagation)
    - [3.4 Circular Dependency Detection](#34-circular-dependency-detection)
    - [3.5 Multiple Service Registration](#35-multiple-service-registration)
    - [3.6 Type-Safe Tokens](#36-type-safe-tokens)
    - [3.7 Decorator-Based Injection (Optional Layer)](#37-decorator-based-injection-optional-layer)
      - [@Injectable](#injectable)
      - [@Inject / @InjectOptional](#inject--injectoptional)
      - [Auto-registration](#auto-registration)
    - [3.8 Module System](#38-module-system)
    - [3.9 Container Lifecycle \& Dispose](#39-container-lifecycle--dispose)
    - [3.10 Developer Experience](#310-developer-experience)
      - [Error messages with resolution path](#error-messages-with-resolution-path)
      - [Container inspection](#container-inspection)
      - [Build-time validation](#build-time-validation)
    - [3.11 Performance Optimisations](#311-performance-optimisations)
    - [3.12 Security Hardening](#312-security-hardening)
  - [4. Public API Reference](#4-public-api-reference)
    - [`Token<T>`](#tokent)
    - [`ContainerBuilder`](#containerbuilder)
    - [`IDependencyContainer`](#idependencycontainer)
    - [`BindingBuilder`](#bindingbuilder)
    - [`IModule`](#imodule)
    - [`IDisposable` / `IAsyncDisposable`](#idisposable--iasyncdisposable)
  - [5. Directory Structure (target)](#5-directory-structure-target)
  - [6. Design Decisions \& ADRs](#6-design-decisions--adrs)
    - [ADR-01 — Explicit async: `resolve()` stays synchronous](#adr-01--explicit-async-resolve-stays-synchronous)
    - [ADR-02 — Typed `Token<T>` over `reflect-metadata` in core](#adr-02--typed-tokent-over-reflect-metadata-in-core)
    - [ADR-03 — Build-time lock: container is immutable after `build()`](#adr-03--build-time-lock-container-is-immutable-after-build)
    - [ADR-04 — Circular dependency: throw, never auto-resolve](#adr-04--circular-dependency-throw-never-auto-resolve)
    - [ADR-05 — Promise cache (not value cache) for async singletons](#adr-05--promise-cache-not-value-cache-for-async-singletons)
    - [ADR-06 — Decorator layer is optional, never required](#adr-06--decorator-layer-is-optional-never-required)
  - [7. Release Plan](#7-release-plan)
    - [Permanently out of scope](#permanently-out-of-scope)

---

## 1. Design Philosophy

`minject` is built around four principles, in this order of priority:

1. **Async-first** — Database connections, config loading, and secret fetching all happen at startup. Async factories and async resolution chains are first-class, not bolted on.
2. **Full TypeScript type-safety without reflection hacks** — Typed tokens carry generic type information as a phantom type. `resolve(token)` infers the return type without `reflect-metadata` or `emitDecoratorMetadata` in the core.
3. **Zero runtime overhead** — Dependency graphs are pre-built at `build()` time. Resolution at runtime is a Map lookup, not a traversal. Singleton cache stores Promises (not resolved values) to prevent duplicate factory runs.
4. **Explicit over magic** — Factory-based injection is always available and is the primary path. Decorators are an optional ergonomic layer added in a later phase. The library never requires decorators to function.

Two constraints that never change regardless of features added:

- **Constructor cannot be async.** All async initialisation lives in factory functions or `static create()` methods. The container abstracts this pattern away from callers.
- **Build-time lock.** After `container.build()` completes, no new bindings can be registered. All configuration errors (missing bindings, circular deps, lifetime mismatches) surface at startup, not under traffic.

---

## 2. Architecture Overview

```bash
ContainerBuilder
  │
  ├── register(b => b.bind(Token).toClass/toFactory/toValue)
  │
  └── build() ──► DependencyContainer (root or scope, immutable after build)
                      │
                      ├── resolve<T>(token)            → Promise<T>
                      ├── resolveAll<T>(token)           → Promise<T[]>
                      ├── resolveFactory<T>(token)       → () => Promise<T> (lazy)
                      │
                      └── createScope() ──► DependencyContainer (scoped child)
                                              │
                                              └── same resolve API
                                                  scoped lifetime is local here
```

Key internal components:

| Component             | Responsibility                                                   |
| --------------------- | ---------------------------------------------------------------- |
| `ContainerBuilder`    | Accumulate bindings, run `build()`, validate graph               |
| `BindingRegistry`     | Map from `Token` to `Binding[]` — supports multi-binding         |
| `Binding`             | Holds factory, lifetime                                          |
| `DependencyContainer` | Main container — handles sync + async resolution, singleton/scoped cache |
| `Token<T>`            | Phantom-typed identifier — `T` enables inferred resolution       |
| `DependencyGraph`     | Pre-built at `build()` time, topo-sorted for fast resolution     |
| `CircularDetector`    | DFS over graph during `build()`, throws with full chain on cycle |

---

## 3. Feature Set

### 3.1 Container Hierarchy & Scopes

Three lifetime scopes define how long an instance lives:

| Lifetime    | Scope                                                     | Typical use case                          |
| ----------- | --------------------------------------------------------- | ----------------------------------------- |
| `Singleton` | One instance per root container, shared across all scopes | DB connections, config, loggers           |
| `Scoped`    | One instance per `createScope()` call                     | Per-request services in Express / Fastify |
| `Transient` | New instance on every `resolve()`                         | Stateless utilities, value objects        |

```typescript
// Root container — singletons live here
const container = builder.build();

// Scoped container — one per HTTP request
app.use((req, _res, next) => {
    req.scope = container.createScope();
    next();
});

const userService = await req.scope.resolve(UserService); // new per scope
const db = await req.scope.resolve(Database); // same singleton from root
```

**Captive dependency detection** — a Singleton that depends on a Scoped service is a
configuration error (the singleton "captures" the scoped instance permanently).
This is detected and warned at `build()` time.

---

### 3.2 Binding System & Fluent DSL

The fluent `BindingBuilder` supports four binding styles:

```typescript
builder.register(b => {
    // 1. Class binding — container calls new Impl(container)
    b.bind(ILogger).toClass(ConsoleLogger).asSingleton();

    // 2. Factory binding — full control, supports sync/async
    b.bind(UserRepository)
        .toFactory(async c => new UserRepository(await c.resolve(Database)))
        .asScoped();

    // 3. Value binding — pre-constructed instance or primitive
    b.bind(Config).toValue({ port: 3000, dbUrl: process.env.DB_URL });
});
```

Lifetime is set via `.asSingleton()`, `.asScoped()`, or `.asTransient()`.
`asTransient()` is the default when no lifetime method is called.

---

### 3.3 Async Resolution

This is the most important feature in `minject`. Node.js startup routinely involves
async operations — DB connects, secret fetches, config file reads — and the container
must handle this without ceremony.

#### Two-phase init

```bash
Phase 1 — register (synchronous, instant)
  All bindings are declared. No factories run yet.

Phase 2 — build (asynchronous, runs once)
  await container.buildAsync()
  All async singleton factories run concurrently where possible.
  Container is immutable after this point.
```

#### API

```typescript
// Async resolution is the default
const db = await container.resolve(Database);

// Async factory chain — async and sync deps can be mixed
builder.register(b =>
    b
        .bind(UserService)
        .toFactory(async c => {
            const db = await c.resolve(Database); // await for deps
            const cfg = await c.resolve(Config);
            return new UserService(db, cfg);
        })
        .asSingleton()
);
```

#### Promise cache for singletons

For singleton async factories, the container caches the `Promise` itself — not the
resolved value. If ten callers request the same singleton concurrently, all ten
receive the same `Promise`. The factory runs exactly once.

```typescript
// Internal implementation pattern
private asyncCache = new Map<Token<unknown>, Promise<unknown>>();

async resolveAsync<T>(token: Token<T>): Promise<T> {
  if (!this.asyncCache.has(token)) {
    // Cache before awaiting — prevents concurrent duplicate factory runs
    this.asyncCache.set(token, this.runFactory(token));
  }
  return this.asyncCache.get(token) as Promise<T>;
}
```

#### Mixed sync/async chains

The container validates at `build()` that a sync factory never depends on a token
that only has an async factory. This forces the dependency chain to be explicit
and prevents silent `Promise` objects from leaking into sync code.

#### Async error propagation

Errors thrown inside an async factory are wrapped in `AsyncResolutionError`
with the full resolution path:

```bash
AsyncResolutionError: Failed to resolve Database
  Caused by: ECONNREFUSED 127.0.0.1:5432
  Resolution path: AppController → UserService → Database
```

---

### 3.4 Circular Dependency Detection

Circular dependencies are architecture errors — `minject` throws rather than
hanging or stack-overflowing.

Detection runs as a DFS over the pre-built dependency graph during `build()`.
If a node is encountered that is already on the current path, the cycle is
reported with the full chain:

```bash
CircularDependencyError: Circular dependency detected
  A → B → C → A

  Suggestion: Break the cycle by introducing an interface, a factory
  function, or by restructuring service boundaries.
```

Detection covers both sync and async factory chains. The error is always thrown
during `build()`, never during the first `resolve()` at runtime.

---

### 3.5 Multiple Service Registration

Multiple implementations can be bound to the same token.
Registration order is preserved and deterministic.

```typescript
builder.register(b => b.bind(EventHandler).to(LoggingHandler).asSingleton());
builder.register(b => b.bind(EventHandler).to(MetricsHandler).asSingleton());
builder.register(b => b.bind(EventHandler).to(AuditHandler).asSingleton());

// Returns array in registration order
const handlers = container.resolveAll(EventHandler);
// → [LoggingHandler, MetricsHandler, AuditHandler]

// Async variant
const handlers = await container.resolveAllAsync(EventHandler);
```

`resolve(token)` (singular) returns the **last** registered implementation,
matching the conventional "override the default" DI behaviour.
`resolveAll(token)` returns all implementations.

---

### 3.6 Type-Safe Tokens

`Token<T>` is the primary mechanism for type-safe resolution. It carries `T` as
a phantom type — the compiler infers the return type of `resolve()` without
any runtime metadata or decorators.

```typescript
// Define tokens alongside service interfaces
export const DB_TOKEN = new Token<Database>('Database');
export const CONFIG_TOKEN = new Token<AppConfig>('AppConfig');
export const LOGGER_TOKEN = new Token<ILogger>('ILogger');

// resolve() infers return type — no cast needed
const db = await container.resolve(DB_TOKEN); // type: Database
const config = await container.resolve(CONFIG_TOKEN); // type: AppConfig

// Class constructors also work as tokens
const logger = await container.resolve(ConsoleLogger); // type: ConsoleLogger
```

The phantom type is erased at runtime — zero overhead. This approach avoids
`reflect-metadata` in the core entirely. For interface tokens (where the type
has no runtime representation), `Token<T>` is the only option and it works correctly.

---

### 3.7 Decorator-Based Injection (Optional Layer)

Decorators reduce boilerplate for large codebases. They are **never required** —
the factory-based API always works. The core container has no dependency on
`reflect-metadata`.

#### @Injectable

Marks a class for auto-registration. Requires `emitDecoratorMetadata: true`.

```typescript
@Injectable({ lifetime: Lifetime.Singleton })
class DatabaseService {
    constructor(private logger: ILogger) {}
}
```

#### @Inject / @InjectOptional

Inject a specific token into a constructor parameter:

```typescript
class UserService {
    constructor(
        @Inject(DB_TOKEN) private db: Database,
        @Inject(CONFIG_TOKEN) private cfg: AppConfig,
        @InjectOptional(LOGGER_TOKEN) private logger?: ILogger
    ) {}
}
```

`@InjectOptional` resolves to `undefined` if the token is not registered,
rather than throwing `BindingNotFoundError`.

#### Auto-registration

```typescript
const container = await new ContainerBuilder()
    .scan('./src/services') // discovers all @Injectable classes
    .buildAsync();
```

**When NOT to use decorators:**

- In library code that ships to consumers (forces `emitDecoratorMetadata` on them)
- When the factory needs non-trivial async init — use `toAsyncFactory` directly
- When debugging DI wiring — explicit factories have clearer stack traces

---

### 3.8 Module System

Modules group related bindings and allow a container to be composed from
named, replaceable units — the standard pattern for large applications.

```typescript
class DatabaseModule implements IModule {
    async register(builder: ContainerBuilder): Promise<void> {
        builder.register(b =>
            b
                .bind(Database)
                .toAsyncFactory(async c => Database.create(c.resolve(Config).dbUrl))
                .asSingleton()
        );
        builder.register(b =>
            b
                .bind(UserRepository)
                .toFactory(c => new UserRepository(c.resolve(Database) as any))
                .asScoped()
        );
    }
}

// Compose at startup
const container = await new ContainerBuilder()
    .load(new DatabaseModule())
    .load(new HttpModule())
    .build();
```

Modules are the recommended pattern for production apps. Each module owns its own
slice of the DI graph and can be replaced independently — swap `DatabaseModule` with
`InMemoryDatabaseModule` in tests without touching anything else.

---

### 3.9 Container Lifecycle & Dispose

Production applications need deterministic teardown. Services are disposed in
**reverse initialisation order** so that dependants are torn down before their dependencies.

```typescript
// Services opt into disposability
class DatabaseService implements IAsyncDisposable {
    async dispose(): Promise<void> {
        await this.connection.close();
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    await container.dispose(); // tears down in reverse-init order
    process.exit(0);
});
```

`IDisposable` (sync) and `IAsyncDisposable` (async) are both provided by `minject`.
The container calls `dispose()` on all registered disposable singletons and scoped
instances during teardown.

Scoped containers can be disposed at the end of their unit of work:

```typescript
const scope = container.createScope();
try {
    await handleRequest(scope);
} finally {
    await scope.dispose(); // cleans up all scoped instances in this scope
}
```

---

### 3.10 Developer Experience

#### Error messages with resolution path

Every error includes the full resolution chain:

```bash
BindingNotFoundError: No binding found for token 'UserRepository'
  Resolution path: AppController → UserService → [UserRepository]
  Hint: Did you forget to register UserRepository in your ContainerBuilder?

LifetimeMismatchError: Singleton 'AuthService' depends on Scoped 'RequestContext'
  Singletons cannot capture scoped dependencies — the scoped instance will be
  frozen at the point AuthService is first resolved.
  Fix: change AuthService to Scoped, or inject a factory instead.
```

#### Container inspection

```typescript
container.getBindings();
// → [{ token: 'Database', lifetime: 'Singleton', type: 'asyncFactory' }, ...]

container.getStatistics();
// → { totalResolutions: 1240, cacheHits: 1180, asyncResolutions: 3 }

container.visualize();
// → Mermaid markdown of the full dependency graph
```

#### Build-time validation

All of the following surface at `build()` / `buildAsync()`, before the application
serves any traffic:

- Missing bindings (factory depends on token never registered)
- Circular dependencies (DFS over the full graph)
- Captive dependency violations (singleton → scoped)
- Sync factory depending on an async-only token
- Duplicate singleton registrations (warning in normal mode, error in strict mode)

---

### 3.11 Performance Optimisations

**Pre-built dependency graph** — during `build()`, the container traverses all bindings
and constructs a topologically sorted graph. Runtime `resolve()` follows the pre-computed
order — no traversal on the hot path.

**Singleton Promise cache** — async singletons cache their `Promise` immediately on first
resolution. Concurrent callers receive the same `Promise` and the factory runs exactly once.
After settlement, subsequent calls return the cached value directly.

**Lazy resolution** — `resolveFactory<T>(token)` returns `() => T` instead of the instance.
The factory is not invoked until the returned function is called. Useful for optional
dependencies and for breaking async chains:

```typescript
const getLogger = container.resolveFactory(ILogger);
// ... only when needed:
getLogger().log('message');
```

**Scoped fast path** — scoped containers keep their own instance cache. A previously
resolved scoped service is a single Map hit — no factory re-invocation.

---

### 3.12 Security Hardening

- **Prototype pollution prevention** — Token lookups use a `Map` keyed by `Token` object
  identity, never by string keys on a plain object. The `name` string passed to
  `new Token('name')` is for debug labelling only.
- **Production error sanitisation** — In `NODE_ENV=production`, resolution error messages
  omit internal stack traces and factory source code. Errors remain typed and catchable.
- **Container freeze** — `container.freeze()` explicitly prevents further `bind()` calls.
  The build-time lock is automatic, but `freeze()` adds a safety net when the container
  reference is passed to untrusted code.
- **No eval, no dynamic property access** — the container never constructs property names
  dynamically from user input.

---

## 4. Public API Reference

### `Token<T>`

```typescript
const MY_TOKEN = new Token<MyService>('MyService');
```

### `ContainerBuilder`

```typescript
const builder = new ContainerBuilder();

builder.register(b => { /* bind calls */ });
builder.load(module: IModule): ContainerBuilder;
builder.scan(path: string): ContainerBuilder;     // requires @Injectable

const container = builder.build();                // sync — no async factories allowed
const container = await builder.buildAsync();     // supports async factories
```

### `IDependencyContainer`

```typescript
resolve<T>(token: Token<T> | Constructor<T>): Promise<T>;
resolveAll<T>(token: Token<T> | Constructor<T>): Promise<T[]>;
resolveFactory<T>(token: Token<T> | Constructor<T>): () => Promise<T>;

// Scope
createScope(): IDependencyContainer;

// Lifecycle
dispose(): Promise<void>;
```

### `BindingBuilder`

```typescript
b.bind(token)
  .toClass(ImplementationClass)
  .toFactory(c => new Impl(await c.resolve(...)))
  .toValue(instance)
  // then one of:
  .asSingleton()
  .asScoped()
  .asTransient()   // default
```

### `IModule`

```typescript
interface IModule {
    register(builder: ContainerBuilder): void | Promise<void>;
}
```

### `IDisposable` / `IAsyncDisposable`

```typescript
interface IDisposable {
    dispose(): void;
}
interface IAsyncDisposable {
    dispose(): Promise<void>;
}
```

---

## 5. Directory Structure (target)

```bash
src/
├── binding/
│   ├── Binding.ts              # DTO: factory | asyncFactory | value + lifetime
│   ├── BindingBuilder.ts       # Fluent DSL
│   └── BindingRegistry.ts      # Map<Token, Binding[]> with multi-binding support
│
├── container/
│   ├── IDependencyContainer.ts # Public interface
│   ├── DependencyContainer.ts  # Unified container — resolution + instance cache
│   └── ContainerBuilder.ts     # Registration + build()
│
├── factory/
│   └── Factory.ts              # Unified factory (sync/async)
│
├── decorators/                 # Optional — requires reflect-metadata
│   ├── Injectable.ts
│   ├── Inject.ts
│   ├── InjectOptional.ts
│   └── Scanner.ts
│
├── errors/
│   ├── BindingNotFoundError.ts
│   ├── CircularDependencyError.ts
│   ├── ImplementationMismatchError.ts
│   ├── KeyMismatchError.ts
│   └── LifetimeMismatchError.ts
│
├── graph/
│   ├── DependencyGraph.ts      # Topo-sorted pre-built graph
│   └── CircularDetector.ts     # DFS cycle detection
│
├── lifecycle/
│   ├── IDisposable.ts
│   └── IAsyncDisposable.ts
│
├── module/
│   └── IModule.ts
│
├── token/
│   └── Token.ts                # Phantom-typed identifier
│
└── index.ts                    # Public exports

tests/
├── container/
│   ├── resolution.test.ts
│   ├── async-resolution.test.ts
│   ├── scoped-lifetime.test.ts
│   ├── circular-detection.test.ts
│   ├── multi-binding.test.ts
│   └── dispose.test.ts
├── binding/
│   └── builder.test.ts
├── decorators/
│   └── injectable.test.ts
└── integration/
    ├── express.test.ts
    └── fastify.test.ts
```

---

## 6. Design Decisions & ADRs

### ADR-01 — Async-first: `resolve()` is asynchronous

**Decision:** Make `resolve()` return a `Promise<T>` by default.

**Rationale:** Modern Node.js applications are heavily dependent on asynchronous
operations (DB, Config, KMS). By making the container async-first, we eliminate
the friction of mixing sync/async registries and "leaky promise" bugs. Every
resolution behaves the same, whether it hit a cached singleton or triggered
an async factory.

**Alternative rejected:** Maintain separate `resolve()` and `resolveAsync()`.
Adds API surface and forces developers to constanty choose between them.

---

### ADR-02 — Typed `Token<T>` over `reflect-metadata` in core

**Decision:** Use `Token<T>` as a phantom-typed identifier. The core has no dependency
on `reflect-metadata`.

**Rationale:** `reflect-metadata` requires `emitDecoratorMetadata: true` in the consumer's
`tsconfig.json`, uses the legacy decorator proposal, and adds runtime weight. `Token<T>`
achieves identical type inference at zero runtime cost. Decorators are an optional module.

**Alternative rejected:** Require `reflect-metadata` everywhere. Imposes build config
constraints on all consumers of the library.

---

### ADR-03 — Build-time lock: container is immutable after `build()`

**Decision:** `build()` / `buildAsync()` freezes the container. Any `bind()` call after
`build()` throws `ContainerFrozenError`.

**Rationale:** A mutable container allows configuration bugs to surface at any point during
application lifetime. Freezing at startup turns all configuration errors into hard crashes
at boot — the best possible time to find them.

---

### ADR-04 — Circular dependency: throw, never auto-resolve

**Decision:** `CircularDependencyError` is thrown with the full dependency chain.
No attempt is made to auto-resolve via lazy proxies.

**Rationale:** Circular dependencies are architecture errors. Auto-resolving them hides the
problem and makes the code harder to reason about. An explicit error forces the developer to
fix the design.

---

### ADR-05 — Promise cache (not value cache) for async singletons

**Decision:** The async singleton cache stores `Promise<T>`, not the resolved `T`.

**Rationale:** Caching the resolved value requires all concurrent callers to wait for the
first to finish. Caching the `Promise` means all concurrent callers share the same
`Promise` immediately — the factory runs once and all callers resolve together.

---

### ADR-06 — Decorator layer is optional, never required

**Decision:** `decorators/` is a separate import path. The core functions without it.

**Rationale:** Library authors, strict DI practitioners, and environments that avoid
legacy decorators should be able to use `minject` without any `tsconfig` changes.
Keeping decorators optional ensures the library works in any TypeScript project.

---

## 7. Release Plan

| Version    | Scope            | Key deliverables                                                     |
| ---------- | ---------------- | -------------------------------------------------------------------- |
| **v0.1.0** | Foundation       | Container hierarchy, fluent DSL, three lifetimes, ESM, Vitest (Completed) |
| **v0.2.0** | Stability        | resolveFactory(), multi-binding support, circular detection |
| **v1.0.0** | Core complete    | Async resolution (Completed), captive dep warnings |
| **v1.1.0** | DX               | Module system, build-time validation, error resolution paths         |
| **v1.2.0** | Lifecycle        | Async dispose, `IAsyncDisposable`, reverse-order teardown            |
| **v1.3.0** | Performance      | Pre-built dep graph, topo-sort, `visualize()`, container inspection  |
| **v2.0.0** | Full feature set | Optional decorator layer, auto-scan, production hardening, full docs |

**v1.0.0** is the first version suitable for production use. The decorator layer,
module system, and dispose lifecycle are explicitly post-1.0 to keep scope tight.

### Permanently out of scope

- **Magic auto-wiring by parameter name** — all wiring is factory-explicit or decorator-explicit.
- **Browser bundle** — `minject` targets Node.js; browser support is not a goal.
- **Custom lifetime plugins** — singleton, scoped, and transient cover all practical cases.
  Custom lifetime hooks would significantly increase API surface and complexity.

---

_This document describes the complete intended design of `minject`.
It is a specification, not a live tracker — implementation status is tracked in GitHub Issues and PRs._
