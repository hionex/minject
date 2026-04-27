import { BindingBuilder } from '@/binding/BindingBuilder.js';
import { ContainerBuilder } from '@/container/ContainerBuilder.js';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError.js';
import { FrozenContainerError } from '@/errors/FrozenContainerError.js';
import { IDisposable } from '@/lifecycle/IDisposable.js';
import { Token } from '@/token/Token.js';
import { FactoryBuilder, SyncFactory, AsyncFactory } from '@/factory/Factory.js';
import { describe, expect, it } from 'vitest';

describe('DependencyContainer', () => {
    it('should handle toFactory correctly', async () => {
        const token = Token.for<string>('test');
        const builder = new BindingBuilder<string, any>();
        const factoryFn = (c: any) => 'factory-value';
        builder.bind(token).toFactory(factoryFn);

        const binding = builder.build();
        const result = await binding.factory.create({} as any);
        expect(result).toBe('factory-value');
    });

    it('should cover AsyncFactory explicitly', async () => {
        const factory = FactoryBuilder.async(async () => 'async-value');
        expect(factory).toBeInstanceOf(AsyncFactory);
        expect(factory.isAsync).toBe(true);
        const result = await factory.create({} as any);
        expect(result).toBe('async-value');
    });

    it('should report isAsync correctly for all Factory types', () => {
        const syncFactory = FactoryBuilder.sync(() => 'value');
        expect(syncFactory).toBeInstanceOf(SyncFactory);
        expect(syncFactory.isAsync).toBe(false);

        const asyncFactory = FactoryBuilder.async(async () => 'value');
        expect(asyncFactory).toBeInstanceOf(AsyncFactory);
        expect(asyncFactory.isAsync).toBe(true);

        const fromFactory = FactoryBuilder.from(() => 'value');
        expect(fromFactory).toBeInstanceOf(SyncFactory);
        expect(fromFactory.isAsync).toBe(false);
    });

    it('should handle toAsyncFactory in builder', () => {
        const token = Token.for<string>('test');
        const builder = new BindingBuilder<string, any>();
        builder.bind(token).toAsyncFactory(async () => 'async-result');

        const binding = builder.build();
        expect(binding.isAsync).toBe(true);
    });

    it('should resolve a transient implementation', async () => {
        const token = Token.for('test');
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(token).toValue('value').asTransient());
        const container = builder.build();

        const result = await container.resolve(token);
        expect(result).toBe('value');
    });

    it('should resolve a singleton implementation and share it', async () => {
        const token = Token.for('test');
        const builder = new ContainerBuilder();
        let counter = 0;
        builder.register(b =>
            b
                .bind(token)
                .toFactory(() => ++counter)
                .asSingleton()
        );
        const container = builder.build();

        const result1 = await container.resolve(token);
        const result2 = await container.resolve(token);

        expect(result1).toBe(1);
        expect(result2).toBe(1);
    });

    it('should resolve a scoped implementation and share it within the same scope', async () => {
        const token = Token.for('test');
        const builder = new ContainerBuilder();
        let counter = 0;
        builder.register(b =>
            b
                .bind(token)
                .toFactory(() => ++counter)
                .asScoped()
        );
        const container = builder.build();

        const scope1 = container.createScope();
        const res1a = await scope1.resolve(token);
        const res1b = await scope1.resolve(token);

        const scope2 = container.createScope();
        const res2a = await scope2.resolve(token);

        expect(res1a).toBe(1);
        expect(res1b).toBe(1);
        expect(res2a).toBe(2);
    });

    it('should resolve singleton from the root container even when called from a scope', async () => {
        const token = Token.for('test');
        const builder = new ContainerBuilder();
        let counter = 0;
        builder.register(b =>
            b
                .bind(token)
                .toFactory(() => ++counter)
                .asSingleton()
        );
        const container = builder.build();

        const scope = container.createScope();
        const res1 = await scope.resolve(token);
        const res2 = await container.resolve(token);

        expect(res1).toBe(1);
        expect(res2).toBe(1);
    });

    it('should resolveAll implementations for a token', async () => {
        const token = Token.for('test');
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(token).toValue('v1'));
        builder.register(b => b.bind(token).toValue('v2'));
        const container = builder.build();

        const results = await container.resolveAll(token);
        expect(results).toHaveLength(2);
        expect(results).toContain('v1');
        expect(results).toContain('v2');
    });

    it('should throw BindingNotFoundError when token is missing', async () => {
        const builder = new ContainerBuilder();
        const container = builder.build();
        const token = Token.for('missing');
        await expect(container.resolve(token)).rejects.toThrow(BindingNotFoundError);
    });

    it('should throw FrozenContainerError when resolving singleton in a frozen container', async () => {
        const token = Token.for('test');
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(token).toValue('value').asSingleton());
        const container = builder.build();
        container.freeze();

        await expect(container.resolve(token)).rejects.toThrow(FrozenContainerError);
    });

    it('should throw FrozenContainerError when resolving transient in a frozen container', async () => {
        const token = Token.for('test');
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(token).toValue('value').asTransient());
        const container = builder.build();
        container.freeze();

        await expect(container.resolve(token)).rejects.toThrow(FrozenContainerError);
    });

    it('should throw FrozenContainerError when resolving scoped in a frozen container', async () => {
        const token = Token.for('test');
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(token).toValue('value').asScoped());
        const container = builder.build();
        container.freeze();

        await expect(container.resolve(token)).rejects.toThrow(FrozenContainerError);
    });

    it('should dispose instances and child scopes in reverse order', async () => {
        const s1 = Token.for('s1');
        const s2 = Token.for('s2');
        const builder = new ContainerBuilder();
        const logs: string[] = [];

        class DisposableService implements IDisposable {
            constructor(private name: string) {}
            dispose() {
                logs.push(`disposed-${this.name}`);
            }
        }

        builder.register(b =>
            b
                .bind(s1)
                .toFactory(() => new DisposableService('s1'))
                .asSingleton()
        );
        builder.register(b =>
            b
                .bind(s2)
                .toFactory(() => new DisposableService('s2'))
                .asSingleton()
        );

        const container = builder.build();
        await container.resolve(s1);
        await container.resolve(s2);

        await container.dispose();

        expect(logs).toEqual(['disposed-s2', 'disposed-s1']);
    });

    it('should dispose child scopes when parent is disposed', async () => {
        const token = Token.for('scoped');
        const builder = new ContainerBuilder();
        const logs: string[] = [];

        class DisposableService implements IDisposable {
            constructor(private name: string) {}
            dispose() {
                logs.push(`disposed-${this.name}`);
            }
        }

        builder.register(b =>
            b
                .bind(token)
                .toFactory(() => new DisposableService('scoped'))
                .asScoped()
        );

        const container = builder.build();
        const scope = container.createScope();
        await scope.resolve(token);

        await container.dispose();

        expect(logs).toContain('disposed-scoped');
    });

    it('should satisfy ScopedContainer coverage', async () => {
        const { ScopedContainer } = await import('@/container/ScopedContainer.js');
        const { BindingRegistry } = await import('@/binding/BindingRegistry.js');
        const registry = new BindingRegistry<any>();
        const parent = new (await import('@/container/DependencyContainer.js')).DependencyContainer(
            registry
        );
        const scoped = new ScopedContainer(registry, parent);

        expect(scoped).toBeDefined();
        const child = scoped.createScope();
        expect(child).toBeInstanceOf(ScopedContainer);
    });

    it('should throw UnknownLifetimeError for invalid lifetime', async () => {
        const { DependencyContainer } = await import('@/container/DependencyContainer.js');
        const { BindingRegistry } = await import('@/binding/BindingRegistry.js');
        const { Binding, Lifetime } = await import('@/binding/Binding.js');
        const { Token } = await import('@/token/Token.js');
        const { FactoryBuilder } = await import('@/factory/Factory.js');
        const { UnknownLifetimeError } = await import('@/errors/UnknowLifetimeError.js');

        const registry = new BindingRegistry<any>();
        const token = Token.for('test');
        // Cast as any to inject invalid lifetime
        const binding = new Binding(
            token,
            'invalid' as any,
            FactoryBuilder.sync(() => 'value')
        );
        registry.register(binding);

        const container = new DependencyContainer(registry);
        // Async path
        await expect(container.resolve(token)).rejects.toThrow(UnknownLifetimeError);
        await expect(container.resolveAll(token)).rejects.toThrow(UnknownLifetimeError);
        // Sync path
        expect(() => container.get(token)).toThrow(UnknownLifetimeError);
        expect(() => container.getAll(token)).toThrow(UnknownLifetimeError);
    });

    it('should use custom registry in ContainerBuilder', async () => {
        const { ContainerBuilder } = await import('@/container/ContainerBuilder.js');
        const { BindingRegistry } = await import('@/binding/BindingRegistry.js');
        const registry = new BindingRegistry();
        const builder = new ContainerBuilder(registry);
        expect(builder).toBeDefined();
    });
});
