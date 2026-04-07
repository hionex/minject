import { describe, it, expect } from 'vitest';
import { ContainerBuilder } from '@/container/ContainerBuilder.js';
import { Token } from '@/token/Token.js';

describe('Integration: High-level Design', () => {
    it('should behave as a framework-agnostic DI container', async () => {
        const builder = new ContainerBuilder();

        // Define some tokens
        const DB_TOKEN = Token.for<{ query: (sql: string) => string }>('Database');
        const LOGGER_TOKEN = Token.for<{ log: (msg: string) => void }>('Logger');
        const APP_TOKEN = Token.for<{ start: () => void }>('App');

        // Register services
        builder.register(b =>
            b
                .bind(DB_TOKEN)
                .toValue({ query: sql => `Result: ${sql}` })
                .asSingleton()
        );
        builder.register(b =>
            b
                .bind(LOGGER_TOKEN)
                .toValue({ log: msg => {} })
                .asSingleton()
        );

        builder.register(b =>
            b
                .bind(APP_TOKEN)
                .toFactory(async c => {
                    const db = await c.resolve(DB_TOKEN);
                    const logger = await c.resolve(LOGGER_TOKEN);
                    return {
                        start: () => {
                            const res = db.query('SELECT *');
                            logger.log(res);
                        },
                    };
                })
                .asSingleton()
        );

        const container = builder.build();
        const app = await container.resolve(APP_TOKEN);

        expect(app).toBeDefined();
        expect(typeof app.start).toBe('function');
    });

    it('should handle scoped request lifecycle (framework-agnostic simulation)', async () => {
        const builder = new ContainerBuilder();

        // Define a Context class that holds request details
        class RequestContext {
            constructor(public requestId: string) {}
        }

        class RequestHandler {
            constructor(private ctx: RequestContext) {}
            handle() {
                return `Handling ${this.ctx.requestId}`;
            }
        }

        // Register the handler as Scoped
        // Use the class itself as the token (Token.fromClass will cache it)
        builder.register(b => b.bind(RequestHandler).toClass(RequestHandler).asScoped());

        const container = builder.build();

        // Simulate two different requests
        const scope1 = container.createScope();
        const scope2 = container.createScope();

        // Both scopes use the SAME registry, so they see the SAME binding.
        // But instances are cached per scope.

        const h1a = await scope1.resolve(RequestHandler);
        const h1b = await scope1.resolve(RequestHandler);
        const h2a = await scope2.resolve(RequestHandler);

        expect(h1a).toBe(h1b); // same in same scope
        expect(h1a).not.toBe(h2a); // different in different scope
    });
});
