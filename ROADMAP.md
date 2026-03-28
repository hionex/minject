# minject Development Roadmap

> **Version:** 1.0.0 → 2.0.0  
> **Last Updated:** 2026-03-25  
> **Status:** Active Development

---

## 📋 Overview

`minject` is a lightweight, SOLID-compliant Dependency Injection library for Node.js/TypeScript. This roadmap outlines the step-by-step plan to evolve it from its current MVP state to a production-ready DI container.

---

## ✅ Phase 0: Foundation (COMPLETED)

### 0.1 Core Architecture

- [x] Container hierarchy (Root → Scoped containers)
- [x] Fluent BindingBuilder DSL
- [x] Three lifetimes: Singleton, Scoped, Transient
- [x] Factory-based dependency injection
- [x] ESM module support
- [x] TypeScript strict mode compliance

### 0.2 Critical Bug Fixes

- [x] **Fixed:** Transient caching bug in `resolveScoped()`
- [x] Test infrastructure (Vitest)
- [x] Comprehensive test coverage for lifetime behavior

**Merged:** PR #3 - "fix: prevent transient services from being cached in scoped containers"

---

## 🚧 Phase 1: Core Features (In Progress)

**Goal:** Complete the essential DI features required for production use.

### 1.1 Async Resolution Support

**Priority:** HIGH  
**Estimated Effort:** 2-3 days

- [ ] Add `resolveAsync<T>(key: Token<T>): Promise<T>` method
- [ ] Add async factory support: `toFactory(async (c) => ...)`
- [ ] Handle async dependency chains
- [ ] Ensure proper error propagation for async failures

**Implementation Notes:**

```typescript
// New interface method
resolveAsync<T>(key: Token<T>): Promise<T>;

// Async factory binding
builder.register((b) =>
  b.bind(Database).toFactory(async (c) => {
    const config = c.resolve(Config);
    const db = new Database(config);
    await db.connect();
    return db;
  }).asSingleton()
);
```

**Files to Modify:**

- `src/container/IDependencyContainer.ts` - Add async interface
- `src/container/DependencyContainer.ts` - Implement async resolution
- `src/binding/Binding.ts` - Support async factories
- `src/binding/BindingBuilder.ts` - Add async factory builder

### 1.2 Circular Dependency Detection

**Priority:** HIGH  
**Estimated Effort:** 1-2 days

- [ ] Track resolution stack during `resolve()` calls
- [ ] Detect circular references before stack overflow
- [ ] Throw descriptive error with dependency chain

**Implementation Notes:**

```typescript
// Error format
CircularDependencyError: 'Circular dependency detected: A -> B -> C -> A';
```

**Files to Modify:**

- `src/container/DependencyContainer.ts` - Add resolution tracking
- `src/errors/CircularDependencyError.ts` - New error class

### 1.3 Multiple Service Registration

**Priority:** MEDIUM  
**Estimated Effort:** 2 days

- [ ] Support registering multiple implementations for one token
- [ ] Add `resolveAll<T>(key: Token<T>): T[]` method
- [ ] Maintain registration order for deterministic resolution

**Implementation Notes:**

```typescript
// Register multiple handlers
builder.register(b => b.bind(EventHandler).to(LoggingHandler).asSingleton());
builder.register(b => b.bind(EventHandler).to(MetricsHandler).asSingleton());

// Resolve all
const handlers = container.resolveAll(EventHandler); // [LoggingHandler, MetricsHandler]
```

**Files to Modify:**

- `src/container/ContainerBuilder.ts` - Support multiple bindings per token
- `src/container/DependencyContainer.ts` - Add `resolveAll()` method
- `src/binding/BindingRegistry.ts` - New class to manage multi-bindings

---

## 🔮 Phase 2: Decorator-Based Injection (Future)

**Goal:** Add optional decorator-based injection for reduced boilerplate.

### 2.1 Metadata Reflection Setup

**Priority:** MEDIUM  
**Estimated Effort:** 1-2 days

- [ ] Configure `reflect-metadata` properly
- [ ] Add `emitDecoratorMetadata` to tsconfig
- [ ] Create metadata keys for injection tokens

**Files to Modify:**

- `tsconfig.json` - Enable decorator metadata
- `src/metadata/InjectionMetadata.ts` - Metadata management utilities

### 2.2 @Injectable Decorator

**Priority:** MEDIUM  
**Estimated Effort:** 2-3 days

- [ ] Create `@Injectable()` class decorator
- [ ] Auto-register classes marked with decorator
- [ ] Support default lifetime configuration

**Usage:**

```typescript
@Injectable({ lifetime: Lifetime.Singleton })
class DatabaseService {
    constructor(private logger: Logger) {}
}
```

### 2.3 @Inject Decorator

**Priority:** MEDIUM  
**Estimated Effort:** 2-3 days

- [ ] Create `@Inject(token)` parameter decorator
- [ ] Support injection by token (not just by type)
- [ ] Handle optional dependencies `@InjectOptional`

**Usage:**

```typescript
class Service {
    constructor(
        @Inject(CONFIG_TOKEN) private config: Config,
        @InjectOptional(LOGGER_TOKEN) private logger?: Logger
    ) {}
}
```

### 2.4 Auto-Registration Container

**Priority:** LOW  
**Estimated Effort:** 2 days

- [ ] Scan directories for `@Injectable` classes
- [ ] Auto-register discovered services
- [ ] Handle circular references during scanning

---

## 🧪 Phase 3: Testing & Quality

**Goal:** Achieve production-grade test coverage and reliability.

### 3.1 Unit Test Coverage

**Priority:** HIGH  
**Current:** ~60%  
**Target:** 95%+

- [ ] ContainerBuilder tests (edge cases, validation)
- [ ] Scoped container lifecycle tests
- [ ] Factory injection tests with complex graphs
- [ ] Error handling tests for all failure modes
- [ ] Mock/fake service testing utilities

### 3.2 Integration Tests

**Priority:** MEDIUM

- [ ] Express.js middleware integration
- [ ] Fastify plugin integration
- [ ] NestJS compatibility layer tests
- [ ] Performance benchmarks

### 3.3 E2E Test Scenarios

**Priority:** MEDIUM

- [ ] Real-world application test (sample REST API)
- [ ] Memory leak detection over long-running processes
- [ ] Concurrent request handling tests

---

## 📦 Phase 4: Developer Experience

### 4.1 Better Error Messages

**Priority:** MEDIUM

- [ ] Custom error classes for each failure mode
- [ ] Include resolution path in error messages
- [ ] Suggest fixes in error messages
- [ ] Source map support for better stack traces

**Example:**

```
BindingNotFoundError: No binding found for token 'DatabaseService'
  Resolution path: AppController -> UserService -> [DatabaseService]
  Suggestion: Did you forget to register DatabaseService?
```

### 4.2 Container Inspection

**Priority:** LOW

- [ ] `container.getBindings(): BindingInfo[]` - List all registrations
- [ ] `container.getStatistics(): ContainerStats` - Resolution counts, cache hits
- [ ] Debug visualization of dependency graph

### 4.3 Configuration Validation

**Priority:** MEDIUM

- [ ] Validate all bindings at build time
- [ ] Check for missing dependencies
- [ ] Warn on duplicate registrations
- [ ] Validate lifetime compatibility in dependency chains

---

## 🔒 Phase 5: Production Readiness

### 5.1 Performance Optimization

**Priority:** MEDIUM

- [ ] Benchmark resolution performance
- [ ] Optimize instance cache lookups
- [ ] Lazy binding resolution
- [ ] Memory usage profiling

### 5.2 Security Hardening

**Priority:** MEDIUM

- [ ] Prevent prototype pollution in token lookups
- [ ] Sanitize error messages in production mode
- [ ] Add `freeze()` method to prevent runtime modifications

### 5.3 Documentation

**Priority:** HIGH

- [ ] API Reference (TypeDoc generated)
- [ ] Usage Guides (patterns, best practices)
- [ ] Migration guides from other DI libraries
- [ ] Architecture Decision Records (ADRs)

---

## 📊 Implementation Timeline

| Phase     | Duration | Target Date | Status     |
| --------- | -------- | ----------- | ---------- |
| Phase 0   | Complete | 2026-03-25  | ✅ Done    |
| Phase 1.1 | 3 days   | 2026-03-28  | 🚧 Next    |
| Phase 1.2 | 2 days   | 2026-03-30  | ⏳ Planned |
| Phase 1.3 | 2 days   | 2026-04-01  | ⏳ Planned |
| Phase 2.x | 2 weeks  | 2026-04-15  | ⏳ Future  |
| Phase 3.x | 1 week   | 2026-04-22  | ⏳ Future  |
| Phase 4.x | 1 week   | 2026-04-29  | ⏳ Future  |
| Phase 5.x | 1 week   | 2026-05-06  | ⏳ Future  |

**v1.0.0 Release Target:** 2026-04-01 (Phase 1 complete)  
**v2.0.0 Release Target:** 2026-05-06 (Full feature set)

---

## 🎯 Current Sprint: Phase 1.1 (Async Resolution)

### Tasks:

1. **Design Async Interface** (Day 1)
    - Define `resolveAsync()` signature
    - Design async factory type
    - Document error handling approach

2. **Implement Core Logic** (Day 1-2)
    - Add async resolution to DependencyContainer
    - Handle mixed sync/async dependency chains
    - Add proper Promise caching for Singletons

3. **Update Binding System** (Day 2)
    - Support `Factory<T> | AsyncFactory<T>` in Binding
    - Update BindingBuilder with `toAsyncFactory()`
    - Validate at build time (no mixing sync/async in same chain if needed)

4. **Test Coverage** (Day 3)
    - Unit tests for async resolution
    - Tests for async singleton caching
    - Tests for error handling in async chains
    - Integration test with real async service (e.g., database)

5. **Documentation** (Day 3)
    - Update README with async examples
    - Add async section to API docs
    - Create async migration guide

### Deliverables:

- [ ] Working `resolveAsync()` implementation
- [ ] Async factory binding support
- [ ] Test coverage >90% for new code
- [ ] Updated documentation
- [ ] PR ready for review

---

## 📝 Notes & Decisions

### Design Decisions:

1. **Explicit vs Implicit Async:**
    - Decision: Keep `resolve()` sync, add `resolveAsync()` for async
    - Rationale: Avoids unexpected Promise returns in sync code
    - Trade-off: Slightly more verbose API

2. **Decorator Support Priority:**
    - Decision: Phase 2, after core features stable
    - Rationale: Current factory-based API is explicit and testable
    - Decorators add magic that can hide complexity

3. **Circular Dependency Strategy:**
    - Decision: Throw error, don't try to auto-resolve
    - Rationale: Circular deps are design smells; explicit errors force fixes

### Technical Debt:

- [ ] Refactor `resolveScoped()` to use strategy pattern for different lifetimes
- [ ] Consider extracting binding validation into separate class
- [ ] Add generic constraints to Token type for better type safety

---

## 🔗 Resources

- **Repository:** https://github.com/hiep20012003/minject
- **PR #3 (Merged):** https://github.com/hiep20012003/minject/pull/3
- **Issues:** https://github.com/hiep20012003/minject/issues
- **Wiki:** (to be created)

---

_This plan is a living document. Update as priorities shift and work is completed._
