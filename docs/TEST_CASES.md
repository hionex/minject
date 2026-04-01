# minject — Test Specification

This document defines the comprehensive test suite for `minject`, ensuring compliance with SOLID principles, architectural constraints, and the project roadmap.

> [!IMPORTANT]
> All resolutions in `minject` are asynchronous by default (`resolve<T>` returns a `Promise<T>`). Tests must account for this "Async-first" design.

---

## 1. Fundamental Resolution (COR)

_Goal: Ensure basic binding types and token identification work as intended._

| ID         | Test Case               | Binding Configuration                                 | Expected Outcome                                                    |
| :--------- | :---------------------- | :---------------------------------------------------- | :------------------------------------------------------------------ |
| **COR-01** | Resolve Class           | `b.bind(A).toClass(A)`                                | Returns an instance of class `A`.                                   |
| **COR-02** | Resolve Factory (Sync)  | `b.bind(A).toFactory(() => new A())`                  | Executes factory and returns the result.                            |
| **COR-03** | Resolve Factory (Async) | `b.bind(A).toFactory(async () => new A())`            | Awaits the factory and returns the resolved result.                 |
| **COR-04** | Resolve Value           | `b.bind(T).toValue(instance)`                         | Returns the exact instance provided during registration.            |
| **COR-05** | Inject Container        | `b.bind(A).toFactory(c => new A(await c.resolve(B)))` | Container is correctly passed to factory for dependency resolution. |
| **COR-06** | Missing Binding         | No registration for `A`, resolve `A`                  | Throws `BindingNotFoundError` with the full resolution path.        |

---

## 2. Lifetime Management (LFT)

_Goal: Validate isolation and sharing of instances according to their defined lifetime._

| ID         | Test Case            | Lifetime                               | Expected Outcome                                                             |
| :--------- | :------------------- | :------------------------------------- | :--------------------------------------------------------------------------- |
| **LFT-01** | Transient Identity   | `Transient`                            | Every call to `resolve` returns a unique instance (different identity).      |
| **LFT-02** | Scoped Identity      | `Scoped`                               | Same instance within one Scope; different instances across different Scopes. |
| **LFT-03** | Singleton Identity   | `Singleton`                            | Exactly one instance shared across the root container and all child scopes.  |
| **LFT-04** | Root as Scope        | `Scoped` (resolved from root)          | Root behaves as a default scope for itself; returns consistent instance.     |
| **LFT-05** | Singleton Dependency | Singleton `A` depends on Singleton `B` | Both are resolved once and cached correctly.                                 |

---

## 3. Async Resolution & Caching (ASY)

_Goal: Ensure thread-safe (race-condition free) async resolution, especially for singletons._

| ID         | Test Case             | Scenario                                         | Expected Outcome                                                              |
| :--------- | :-------------------- | :----------------------------------------------- | :---------------------------------------------------------------------------- |
| **ASY-01** | Promise Caching       | Concurrent requests for the same Async Singleton | Factory runs **exactly once**. All callers receive the same `Promise` result. |
| **ASY-02** | Resolving All         | `resolveAll(Token)`                              | Returns an array of all implementations registered for the token.             |
| **ASY-03** | Resolving All (Async) | Multiple async factories for 1 token             | `resolveAll` awaits all and returns them in registration order.               |
| **ASY-04** | Error Propagation     | Factory throws internal error                    | Error is bubbled up through the resolution promise chain.                     |

---

## 4. Validation & Graph Integrity (VAL)

_Goal: Detect architectural flaws during the `build()` phase before the application starts._

| ID         | Test Case           | Scenario                        | Expected Outcome                                                    |
| :--------- | :------------------ | :------------------------------ | :------------------------------------------------------------------ |
| **VAL-01** | Circular Dependency | `A -> B -> A`                   | Throws `CircularDependencyError` during `build()`.                  |
| **VAL-02** | Complex Cycle       | `A -> B -> C -> D -> B`         | Specifically identifies the cycle path in the error message.        |
| **VAL-03** | Captive Dependency  | `Singleton -> Scoped`           | Throws `LifetimeMismatchError` or warns during `build()`.           |
| **VAL-04** | Frozen Container    | Call `register` after `build()` | Throws `ContainerFrozenError` (Build-time lock).                    |
| **VAL-05** | Multiple Overrides  | Register token twice            | `resolve()` returns the **last** one registered ("Last wins" rule). |

---

## 5. Container Hierarchy & Scoping (SCP)

_Goal: Validate the parent-child relationship of nested containers._

| ID         | Test Case           | Scenario                        | Expected Outcome                                                                        |
| :--------- | :------------------ | :------------------------------ | :-------------------------------------------------------------------------------------- |
| **SCP-01** | Parent-to-Root      | `scope.createScope()`           | The new scope should be a child of the root, not the child of a child (Sibling scopes). |
| **SCP-02** | Binding Inheritance | Resolve root binding from scope | Scopes can resolve bindings registered in their parent/root.                            |
| **SCP-03** | Scoped Isolation    | Update state in scoped instance | State is isolated to that specific scope; others remain unaffected.                     |

---

## 6. Lifecycle & Teardown (LFC)

_Goal: Ensure deterministic cleanup of resources._

| ID         | Test Case     | API/Feature                   | Expected Outcome                                                                |
| :--------- | :------------ | :---------------------------- | :------------------------------------------------------------------------------ |
| **LFC-01** | Dispose Sync  | `IDisposable`                 | Calling `container.dispose()` invokes `dispose()` on all cached services.       |
| **LFC-02** | Dispose Async | `IAsyncDisposable`            | Container awaits the `dispose()` promise of async services.                     |
| **LFC-03** | Reverse Order | Services `A` then `B` created | `B` is disposed first, then `A` (Stack-like teardown).                          |
| **LFC-04** | Scope Dispose | `scope.dispose()`             | Only cleans up instances owned by that scope; Root/other scopes are unaffected. |

---

## 7. Performance & Advanced APIs (ADV)

_Goal: Test lazy loading and inspection features._

| ID         | Test Case       | API/Feature             | Expected Outcome                                                                |
| :--------- | :-------------- | :---------------------- | :------------------------------------------------------------------------------ |
| **ADV-01** | Lazy Factory    | `resolveFactory(Token)` | Returns a function `() => Promise<T>`. Initialization only happens when called. |
| **ADV-02** | Pre-built Graph | Topo-sort efficiency    | Resolution time is O(1) Map lookup + dependency resolution (pre-computed).      |
| **ADV-03** | Visualization   | `container.visualize()` | Returns a valid Mermaid diagram string of the DI graph.                         |

---

## 8. Integration Scenarios (INT)

_Goal: Verify production-like usage patterns._

| ID         | Test Case           | Environment                      | Expected Behavior                                                               |
| :--------- | :------------------ | :------------------------------- | :------------------------------------------------------------------------------ |
| **INT-01** | Express Middleware  | Per-request scoping              | Request-specific state (e.g., Auth User) is safe and isolated in its own scope. |
| **INT-02** | Decorator Auto-scan | `@Injectable`                    | Discovers classes in a directory and registers them automatically (Phase 4).    |
| **INT-03** | Module Loading      | `builder.load(new AuthModule())` | Correctly imports bindings categorized within a module instance.                |
