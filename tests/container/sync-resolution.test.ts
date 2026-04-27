import { ContainerBuilder } from '@/container/ContainerBuilder.js';
import { AsyncBindingError } from '@/errors/AsyncBindingError.js';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError.js';
import { FrozenContainerError } from '@/errors/FrozenContainerError.js';
import { IDisposable } from '@/lifecycle/IDisposable.js';
import { Token } from '@/token/Token.js';
import { describe, expect, it } from 'vitest';

describe('Sync Resolution (get / getAll)', () => {
    // ─── Basic Sync Resolution ───

    it('should resolve a sync toValue binding', () => {
        const token = Token.for<string>('test');
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(token).toValue('hello'));

        const container = builder.build();
        const result = container.get(token);
        expect(result).toBe('hello');
    });

    it('should resolve a sync toFactory binding', () => {
        const token = Token.for<number>('test');
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(token).toFactory(() => 42));

        const container = builder.build();
        const result = container.get(token);
        expect(result).toBe(42);
    });

    it('should resolve a sync toClass binding', () => {
        class MyService {
            value = 'service';
        }
        const token = Token.for<MyService>('test');
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(token).toClass(MyService));

        const container = builder.build();
        const result = container.get(token);
        expect(result).toBeInstanceOf(MyService);
        expect(result.value).toBe('service');
    });

    // ─── Singleton Sync ───

    it('should share singleton instance via get()', () => {
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
        const res1 = container.get(token);
        const res2 = container.get(token);
        expect(res1).toBe(1);
        expect(res2).toBe(1);
    });

    // ─── Scoped Sync ───

    it('should share scoped instance within same scope via get()', () => {
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
        const res1a = scope1.get(token);
        const res1b = scope1.get(token);

        const scope2 = container.createScope();
        const res2a = scope2.get(token);

        expect(res1a).toBe(1);
        expect(res1b).toBe(1);
        expect(res2a).toBe(2);
    });

    // ─── Transient Sync ───

    it('should create new instance for each transient get()', () => {
        const token = Token.for('test');
        const builder = new ContainerBuilder();
        let counter = 0;
        builder.register(b =>
            b
                .bind(token)
                .toFactory(() => ++counter)
                .asTransient()
        );

        const container = builder.build();
        const res1 = container.get(token);
        const res2 = container.get(token);
        expect(res1).toBe(1);
        expect(res2).toBe(2);
    });

    // ─── AsyncBindingError ───

    it('should throw AsyncBindingError for toAsyncFactory via get()', () => {
        const token = Token.for('async-service');
        const builder = new ContainerBuilder();
        builder.register(b =>
            b.bind(token).toAsyncFactory(async () => 'value')
        );

        const container = builder.build();
        expect(() => container.get(token)).toThrow(AsyncBindingError);
    });

    it('should throw AsyncBindingError when toFactory returns a Promise (auto-detect)', () => {
        const token = Token.for('sneaky-async');
        const builder = new ContainerBuilder();
        builder.register(b =>
            b.bind(token).toFactory(() => Promise.resolve('value'))
        );

        const container = builder.build();
        expect(() => container.get(token)).toThrow(AsyncBindingError);
    });

    it('should include token description in AsyncBindingError message', () => {
        const token = Token.for('my-db-service');
        const builder = new ContainerBuilder();
        builder.register(b =>
            b.bind(token).toAsyncFactory(async () => 'db')
        );

        const container = builder.build();
        expect(() => container.get(token)).toThrow(/resolve\(\)/);
    });

    // ─── getAll ───

    it('should resolve all sync implementations with getAll()', () => {
        const token = Token.for('multi');
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(token).toValue('a'));
        builder.register(b => b.bind(token).toValue('b'));
        builder.register(b => b.bind(token).toValue('c'));

        const container = builder.build();
        const results = container.getAll(token);
        expect(results).toHaveLength(3);
        expect(results).toContain('a');
        expect(results).toContain('b');
        expect(results).toContain('c');
    });

    // ─── Error Cases ───

    it('should throw BindingNotFoundError for missing token via get()', () => {
        const builder = new ContainerBuilder();
        const container = builder.build();
        const token = Token.for('missing');
        expect(() => container.get(token)).toThrow(BindingNotFoundError);
    });

    it('should throw FrozenContainerError when using get() on frozen container', () => {
        const token = Token.for('test');
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(token).toValue('value').asSingleton());
        const container = builder.build();
        container.freeze();

        expect(() => container.get(token)).toThrow(FrozenContainerError);
    });

    it('should throw FrozenContainerError for transient get() on frozen container', () => {
        const token = Token.for('test');
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(token).toValue('value').asTransient());
        const container = builder.build();
        container.freeze();

        expect(() => container.get(token)).toThrow(FrozenContainerError);
    });

    it('should throw FrozenContainerError for scoped get() on frozen container', () => {
        const token = Token.for('test');
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(token).toValue('value').asScoped());
        const container = builder.build();
        container.freeze();

        expect(() => container.get(token)).toThrow(FrozenContainerError);
    });

    // ─── Disposable tracking via sync ───

    it('should track disposables created via get()', async () => {
        const token = Token.for('disposable');
        const builder = new ContainerBuilder();
        const logs: string[] = [];

        class DisposableService implements IDisposable {
            dispose() {
                logs.push('disposed');
            }
        }

        builder.register(b =>
            b
                .bind(token)
                .toFactory(() => new DisposableService())
                .asSingleton()
        );

        const container = builder.build();
        container.get(token);
        await container.dispose();

        expect(logs).toEqual(['disposed']);
    });
});
