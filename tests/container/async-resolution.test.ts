import { ContainerBuilder } from '@/container/ContainerBuilder.js';
import { Token } from '@/token/Token.js';
import { describe, expect, it } from 'vitest';

describe('Async Resolution', () => {
    it('should resolve an async factory via resolve()', async () => {
        const token = Token.for<string>('async-token');
        const builder = new ContainerBuilder();

        builder.register(b =>
            b.bind(token).toAsyncFactory(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return 'async-value';
            })
        );

        const container = builder.build();
        const result = await container.resolve(token);
        expect(result).toBe('async-value');
    });

    it('should resolve a deep chain of async and sync dependencies', async () => {
        const t1 = Token.for<number>('t1');
        const t2 = Token.for<number>('t2');
        const t3 = Token.for<number>('t3');
        const builder = new ContainerBuilder();

        // t1 (sync) -> t2 (async) -> t3 (async)
        builder.register(b => b.bind(t3).toAsyncFactory(async () => 10));
        builder.register(b => b.bind(t2).toAsyncFactory(async c => (await c.resolve(t3)) + 20));
        builder.register(b => b.bind(t1).toFactory(async c => (await c.resolve(t2)) + 30));

        const container = builder.build();
        const result = await container.resolve(t1);
        expect(result).toBe(60);
    });

    it('should share the same promise for concurrent singleton resolutions', async () => {
        const token = Token.for<number>('singleton');
        const builder = new ContainerBuilder();
        let callCount = 0;

        builder.register(b =>
            b
                .bind(token)
                .toAsyncFactory(async () => {
                    callCount++;
                    await new Promise(resolve => setTimeout(resolve, 50));
                    return Math.random();
                })
                .asSingleton()
        );

        const container = builder.build();

        // Fire multiple resolutions concurrently
        const [res1, res2, res3] = await Promise.all([
            container.resolve(token),
            container.resolve(token),
            container.resolve(token),
        ]);

        expect(callCount).toBe(1);
        expect(res1).toBe(res2);
        expect(res1).toBe(res3);
    });

    it('should share the same promise for concurrent scoped resolutions', async () => {
        const token = Token.for<number>('scoped');
        const builder = new ContainerBuilder();
        let callCount = 0;

        builder.register(b =>
            b
                .bind(token)
                .toAsyncFactory(async () => {
                    callCount++;
                    await new Promise(resolve => setTimeout(resolve, 50));
                    return Math.random();
                })
                .asScoped()
        );

        const container = builder.build();
        const scope = container.createScope();

        const [res1, res2] = await Promise.all([
            scope.resolve(token),
            scope.resolve(token),
        ]);

        expect(callCount).toBe(1);
        expect(res1).toBe(res2);
    });

    it('should handle errors in async factories', async () => {
        const token = Token.for('error-token');
        const builder = new ContainerBuilder();

        builder.register(b =>
            b.bind(token).toAsyncFactory(async () => {
                throw new Error('Async failure');
            })
        );

        const container = builder.build();
        await expect(container.resolve(token)).rejects.toThrow('Async failure');
    });

    it('should allow retry after async singleton factory rejects', async () => {
        const token = Token.for<string>('retry');
        const builder = new ContainerBuilder();
        let attempt = 0;

        builder.register(b =>
            b
                .bind(token)
                .toAsyncFactory(async () => {
                    attempt++;
                    if (attempt === 1) {
                        throw new Error('First attempt fails');
                    }
                    return 'success';
                })
                .asSingleton()
        );

        const container = builder.build();

        // First attempt — should fail
        await expect(container.resolve(token)).rejects.toThrow('First attempt fails');

        // Second attempt — should succeed (inflight cache was cleared on reject)
        const result = await container.resolve(token);
        expect(result).toBe('success');
        expect(attempt).toBe(2);
    });

    it('should resolve multiple async implementations with resolveAll', async () => {
        const token = Token.for<string>('multi');
        const builder = new ContainerBuilder();

        builder.register(b => b.bind(token).toAsyncFactory(async () => 'a'));
        builder.register(b => b.bind(token).toAsyncFactory(async () => 'b'));

        const container = builder.build();
        const results = await container.resolveAll(token);

        expect(results).toHaveLength(2);
        expect(results).toContain('a');
        expect(results).toContain('b');
    });

    it('should also resolve sync bindings via resolve() (async path)', async () => {
        const token = Token.for<string>('sync-via-async');
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(token).toValue('sync-value'));

        const container = builder.build();
        const result = await container.resolve(token);
        expect(result).toBe('sync-value');
    });
});
