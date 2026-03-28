import { describe, it, expectTypeOf } from 'vitest';
import { ContainerBuilder } from './ContainerBuilder.js';

// Type safety test fixtures
class UserService {
    getUser(id: string): { id: string; name: string } {
        return { id, name: 'John' };
    }
}

class DatabaseService {
    query(sql: string): string[] {
        return [];
    }
}

describe('Type Safety', () => {
    it('should infer correct type when resolving class token', () => {
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(UserService).to(UserService).asSingleton());
        const container = builder.build();

        // TypeScript should infer UserService without explicit generic
        const service = container.resolve(UserService);

        // Type-level assertion: service should be UserService type
        expectTypeOf(service).toEqualTypeOf<UserService>();

        // Should have access to UserService methods with correct types
        const user = service.getUser('123');
        expectTypeOf(user).toEqualTypeOf<{ id: string; name: string }>();
    });

    it('should infer correct type for different service classes', () => {
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(UserService).to(UserService).asSingleton());
        builder.register(b => b.bind(DatabaseService).to(DatabaseService).asSingleton());
        const container = builder.build();

        const userService = container.resolve(UserService);
        const dbService = container.resolve(DatabaseService);

        // Types should be distinct and correct
        expectTypeOf(userService).toEqualTypeOf<UserService>();
        expectTypeOf(dbService).toEqualTypeOf<DatabaseService>();

        // Should not be assignable to each other
        // @ts-expect-error - UserService is not DatabaseService
        expectTypeOf(userService).toEqualTypeOf<DatabaseService>();
    });

    it('should work with factory bindings', () => {
        const builder = new ContainerBuilder();

        builder.register(b => b.bind(DatabaseService).to(DatabaseService).asSingleton());

        builder.register(b =>
            b
                .bind(UserService)
                .toFactory(c => {
                    const db = c.resolve(DatabaseService);
                    return new UserService();
                })
                .asTransient()
        );

        const container = builder.build();
        const service = container.resolve(UserService);

        expectTypeOf(service).toEqualTypeOf<UserService>();
    });
});
