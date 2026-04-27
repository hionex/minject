import { describe, it, expect } from 'vitest';
import { ContainerBuilder } from '@/container/ContainerBuilder.js';
import { IDisposable } from '@/lifecycle/IDisposable.js';
import { Token } from '@/token/Token.js';

describe('Integration: Lifecycle (Async Init & Disposal)', () => {
    it('should support async initialization for singletons', async () => {
        const builder = new ContainerBuilder();
        const asyncToken = Token.for('async');

        let initCalled = false;
        class AsyncService {
            async init() {
                await new Promise(resolve => setTimeout(resolve, 50));
                initCalled = true;
            }
        }

        builder.register(b =>
            b
                .bind(asyncToken)
                .toAsyncFactory(async () => {
                    const service = new AsyncService();
                    await service.init();
                    return service;
                })
                .asSingleton()
        );

        const container = builder.build();
        const start = Date.now();
        const service = await container.resolve(asyncToken);
        const end = Date.now();

        expect(service).toBeDefined();
        expect(initCalled).toBe(true);
        expect(end - start).toBeGreaterThanOrEqual(50);
    });

    it('should dispose services in reverse resolve order', async () => {
        const builder = new ContainerBuilder();
        const logs: string[] = [];

        class Logger implements IDisposable {
            constructor(public name: string) {}
            dispose() {
                logs.push(`disposed ${this.name}`);
            }
        }

        const s1 = Token.for('s1');
        const s2 = Token.for('s2');

        builder.register(b =>
            b
                .bind(s1)
                .toFactory(() => new Logger('s1'))
                .asSingleton()
        );
        builder.register(b =>
            b
                .bind(s2)
                .toFactory(() => new Logger('s2'))
                .asSingleton()
        );

        const container = builder.build();

        // Resolve in order s1 then s2
        await container.resolve(s1);
        await container.resolve(s2);

        await container.dispose();

        // Should be s2 then s1
        expect(logs).toEqual(['disposed s2', 'disposed s1']);
    });

    it('should dispose sync-resolved services correctly', async () => {
        const builder = new ContainerBuilder();
        const logs: string[] = [];

        class SyncService implements IDisposable {
            constructor(public name: string) {}
            dispose() {
                logs.push(`disposed ${this.name}`);
            }
        }

        const s1 = Token.for('sync-s1');
        const s2 = Token.for('sync-s2');

        builder.register(b =>
            b
                .bind(s1)
                .toFactory(() => new SyncService('sync-s1'))
                .asSingleton()
        );
        builder.register(b =>
            b
                .bind(s2)
                .toFactory(() => new SyncService('sync-s2'))
                .asSingleton()
        );

        const container = builder.build();

        // Resolve via sync get()
        container.get(s1);
        container.get(s2);

        await container.dispose();
        expect(logs).toEqual(['disposed sync-s2', 'disposed sync-s1']);
    });

    it('should handle complex async initialization with dependencies', async () => {
        const builder = new ContainerBuilder();
        const configToken = Token.for('config');
        const dbToken = Token.for('db');

        builder.register(b =>
            b
                .bind(configToken)
                .toAsyncFactory(async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return { dbUrl: 'localhost:5432' };
                })
                .asSingleton()
        );

        builder.register(b =>
            b
                .bind(dbToken)
                .toAsyncFactory(async c => {
                    const config = await c.resolve<any>(configToken);
                    return { connected: true, url: config.dbUrl };
                })
                .asSingleton()
        );

        const container = builder.build();
        const db = await container.resolve<any>(dbToken);

        expect(db.connected).toBe(true);
        expect(db.url).toBe('localhost:5432');
    });
});

