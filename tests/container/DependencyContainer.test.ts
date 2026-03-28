import { ContainerBuilder } from '@/container/ContainerBuilder.js';
import { describe, expect, it } from 'vitest';

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
            builder.register(b => b.bind(TransientService).to(TransientService).asTransient());
            const container = builder.build();

            const instance1 = container.resolve(TransientService);
            const instance2 = container.resolve(TransientService);

            expect(instance1).not.toBe(instance2);
            expect(instance1.id).not.toBe(instance2.id);
        });

        it('should create new instance for each resolve in scoped container', () => {
            const builder = new ContainerBuilder();
            builder.register(b => b.bind(TransientService).to(TransientService).asTransient());
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
            builder.register(b => b.bind(ScopedService).to(ScopedService).asScoped());
            const container = builder.build();

            const instance1 = container.resolve(ScopedService);
            const instance2 = container.resolve(ScopedService);

            expect(instance1).toBe(instance2);
        });

        it('should return different instances for different scopes', () => {
            const builder = new ContainerBuilder();
            builder.register(b => b.bind(ScopedService).to(ScopedService).asScoped());
            const root = builder.build();
            const scope1 = root.createScope();
            const scope2 = root.createScope();

            const instance1 = scope1.resolve(ScopedService);
            const instance2 = scope2.resolve(ScopedService);

            expect(instance1).not.toBe(instance2);
        });

        it('should cache instance in scoped container, not in root', () => {
            const builder = new ContainerBuilder();
            builder.register(b => b.bind(ScopedService).to(ScopedService).asScoped());
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
            builder.register(b => b.bind(SingletonService).to(SingletonService).asSingleton());
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
            id = Math.random();
        }

        class ServiceWithRepo {
            constructor(public repo: Repository) {}
        }

        it('should share Singleton dependency across all resolutions', () => {
            const builder = new ContainerBuilder();

            // Repository is Singleton
            builder.register(b => b.bind(Repository).to(Repository).asSingleton());

            // Service is Scoped, depends on Singleton Repository
            builder.register(b =>
                b
                    .bind(ServiceWithRepo)
                    .toFactory(c => new ServiceWithRepo(c.resolve(Repository)))
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

    describe('resolveFactory() API', () => {
        class Repository {
            data: string[] = [];
            id = Math.random();
        }

        class ServiceWithFactory {
            private getRepo: () => Repository;

            constructor(getRepo: () => Repository) {
                this.getRepo = getRepo;
            }

            get repo(): Repository {
                return this.getRepo();
            }
        }

        it('should return a factory function that resolves Transient dependencies', () => {
            const builder = new ContainerBuilder();
            builder.register(b => b.bind(Repository).to(Repository).asTransient());

            const container = builder.build();
            const getRepo = container.resolveFactory(Repository);

            const repo1 = getRepo();
            const repo2 = getRepo();

            // Each call should return a new instance
            expect(repo1).not.toBe(repo2);
            expect(repo1.id).not.toBe(repo2.id);
        });

        it('should work with Scoped dependencies', () => {
            const builder = new ContainerBuilder();
            builder.register(b => b.bind(ScopedService).to(ScopedService).asScoped());

            const root = builder.build();
            const scope1 = root.createScope();

            const getScoped = scope1.resolveFactory(ScopedService);
            const scoped1 = getScoped();
            const scoped2 = getScoped();

            // Within same scope, Scoped returns same instance
            expect(scoped1).toBe(scoped2);
        });

        it('should work with Singleton dependencies', () => {
            const builder = new ContainerBuilder();
            builder.register(b => b.bind(SingletonService).to(SingletonService).asSingleton());

            const root = builder.build();
            const getSingleton = root.resolveFactory(SingletonService);

            const instance1 = getSingleton();
            const instance2 = getSingleton();

            // Singleton should return same instance across calls
            expect(instance1).toBe(instance2);
        });

        it('should allow Scoped service with factory for Transient dependency', () => {
            const builder = new ContainerBuilder();

            // Repository is Transient
            builder.register(b => b.bind(Repository).to(Repository).asTransient());

            // Service is Scoped, uses resolveFactory for Transient dependency
            builder.register(b =>
                b
                    .bind(ServiceWithFactory)
                    .toFactory(c => new ServiceWithFactory(c.resolveFactory(Repository)))
                    .asScoped()
            );

            const root = builder.build();
            const scope = root.createScope();

            const service1 = scope.resolve(ServiceWithFactory);
            const service2 = scope.resolve(ServiceWithFactory);

            // Service should be same (Scoped)
            expect(service1).toBe(service2);

            // But each call to repo should return new instance
            const repo1 = service1.repo;
            const repo2 = service2.repo;

            expect(repo1).not.toBe(repo2);
            expect(repo1.id).not.toBe(repo2.id);
        });
    });

    describe('Factory bindings', () => {
        it('should resolve using factory function', () => {
            const builder = new ContainerBuilder();

            builder.register(b =>
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

            builder.register(b => b.bind(Counter).to(Counter).asSingleton());

            class ServiceWithCounter {
                constructor(public counter: Counter) {}
            }

            builder.register(b =>
                b
                    .bind(ServiceWithCounter)
                    .toFactory(c => new ServiceWithCounter(c.resolve(Counter)))
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

            expect(() => container.resolve(Counter)).toThrow('No binding found for key');
        });
    });
});
