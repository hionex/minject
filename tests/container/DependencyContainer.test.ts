import { describe, it, expect, beforeEach } from 'vitest';
import { ContainerBuilder } from '../src/container/ContainerBuilder.js';
import { IDependencyContainer } from '../src/container/IDependencyContainer.js';

// Test fixtures
class Counter {
    count = 0;
    increment() {
        this.count++;
    }
}

class ScopedService {
    id = Math.random();
}

class TransientService {
    id = Math.random();
}

class SingletonService {
    id = Math.random();
}

describe('DependencyContainer', () => {
    describe('Lifetime: Transient', () => {
        it('should create new instance for each resolve in root container', () => {
            const builder = new ContainerBuilder();
            builder.register((b) =>
                b.bind(TransientService).to(TransientService).asTransient()
            );
            const container = builder.build();

            const instance1 = container.resolve(TransientService);
            const instance2 = container.resolve(TransientService);

            expect(instance1).not.toBe(instance2);
            expect(instance1.id).not.toBe(instance2.id);
        });

        it('should create new instance for each resolve in scoped container', () => {
            const builder = new ContainerBuilder();
            builder.register((b) =>
                b.bind(TransientService).to(TransientService).asTransient()
            );
            const root = builder.build();
            const scope = root.createScope();

            const instance1 = scope.resolve(TransientService);
            const instance2 = scope.resolve(TransientService);

            expect(instance1).not.toBe(instance2);
            expect(instance1.id).not.toBe(instance2.id);
        });
    });

    describe('Lifetime: Scoped', () => {
        it('should return same instance for same scope', () => {
            const builder = new ContainerBuilder();
            builder.register((b) =>
                b.bind(ScopedService).to(ScopedService).asScoped()
            );
            const container = builder.build();

            const instance1 = container.resolve(ScopedService);
            const instance2 = container.resolve(ScopedService);

            expect(instance1).toBe(instance2);
        });

        it('should return different instances for different scopes', () => {
            const builder = new ContainerBuilder();
            builder.register((b) =>
                b.bind(ScopedService).to(ScopedService).asScoped()
            );
            const root = builder.build();
            const scope1 = root.createScope();
            const scope2 = root.createScope();

            const instance1 = scope1.resolve(ScopedService);
            const instance2 = scope2.resolve(ScopedService);

            expect(instance1).not.toBe(instance2);
        });

        it('should cache instance in scoped container, not in root', () => {
            const builder = new ContainerBuilder();
            builder.register((b) =>
                b.bind(ScopedService).to(ScopedService).asScoped()
            );
            const root = builder.build();
            const scope = root.createScope();

            const rootInstance = root.resolve(ScopedService);
            const scopeInstance = scope.resolve(ScopedService);

            // Scoped instances should be isolated per scope
            expect(rootInstance).not.toBe(scopeInstance);
        });
    });

    describe('Lifetime: Singleton', () => {
        it('should return same instance across all scopes', () => {
            const builder = new ContainerBuilder();
            builder.register((b) =>
                b.bind(SingletonService).to(SingletonService).asSingleton()
            );
            const root = builder.build();
            const scope1 = root.createScope();
            const scope2 = root.createScope();

            const rootInstance = root.resolve(SingletonService);
            const scope1Instance = scope1.resolve(SingletonService);
            const scope2Instance = scope2.resolve(SingletonService);

            expect(rootInstance).toBe(scope1Instance);
            expect(rootInstance).toBe(scope2Instance);
        });
    });

    describe('Mixed lifetimes with dependencies', () => {
        class Repository {
            data: string[] = [];
        }

        class ServiceWithRepo {
            constructor(public repo: Repository) {}
        }

        it('should create new Transient dependency each time even when resolved from Scoped parent', () => {
            const builder = new ContainerBuilder();

            // Repository is Transient
            builder.register((b) =>
                b.bind(Repository).to(Repository).asTransient()
            );

            // Service is Scoped, depends on Transient Repository
            builder.register((b) =>
                b
                    .bind(ServiceWithRepo)
                    .toFactory((c) => new ServiceWithRepo(c.resolve(Repository)))
                    .asScoped()
            );

            const root = builder.build();
            const scope = root.createScope();

            // Resolve ServiceWithRepo twice from same scope
            const service1 = scope.resolve(ServiceWithRepo);
            const service2 = scope.resolve(ServiceWithRepo);

            // Service should be same (Scoped)
            expect(service1).toBe(service2);

            // But the Transient Repository should be different each time
            // This is the BUG: if Transient is cached, these would be the same
            expect(service1.repo).not.toBe(service2.repo);
        });

        it('should share Singleton dependency across all resolutions', () => {
            const builder = new ContainerBuilder();

            // Repository is Singleton
            builder.register((b) =>
                b.bind(Repository).to(Repository).asSingleton()
            );

            // Service is Scoped, depends on Singleton Repository
            builder.register((b) =>
                b
                    .bind(ServiceWithRepo)
                    .toFactory((c) => new ServiceWithRepo(c.resolve(Repository)))
                    .asScoped()
            );

            const root = builder.build();
            const scope1 = root.createScope();
            const scope2 = root.createScope();

            const service1 = scope1.resolve(ServiceWithRepo);
            const service2 = scope2.resolve(ServiceWithRepo);

            // Both services should share the same Repository instance
            expect(service1.repo).toBe(service2.repo);
        });
    });

    describe('Factory bindings', () => {
        it('should resolve using factory function', () => {
            const builder = new ContainerBuilder();

            builder.register((b) =>
                b
                    .bind(Counter)
                    .toFactory(() => new Counter())
                    .asTransient()
            );

            const container = builder.build();
            const counter = container.resolve(Counter);

            expect(counter).toBeInstanceOf(Counter);
            counter.increment();
            expect(counter.count).toBe(1);
        });

        it('should inject container into factory for dependency resolution', () => {
            const builder = new ContainerBuilder();

            builder.register((b) =>
                b.bind(Counter).to(Counter).asSingleton()
            );

            class ServiceWithCounter {
                constructor(public counter: Counter) {}
            }

            builder.register((b) =>
                b
                    .bind(ServiceWithCounter)
                    .toFactory((c) => new ServiceWithCounter(c.resolve(Counter)))
                    .asTransient()
            );

            const container = builder.build();
            const service = container.resolve(ServiceWithCounter);

            expect(service.counter).toBe(container.resolve(Counter));
        });
    });

    describe('Error handling', () => {
        it('should throw when resolving unregistered token', () => {
            const builder = new ContainerBuilder();
            const container = builder.build();

            expect(() => container.resolve(Counter)).toThrow(
                'No binding found for key'
            );
        });
    });
});
