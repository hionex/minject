import { ContainerBuilder } from '@/container/ContainerBuilder.js';
import { Token } from '@/token/Token';
import { describe, expect, it } from 'vitest';

class Counter {
    count = 0;
    increment() {
        this.count++;
    }
}

class Service {
    constructor(readonly counter: Counter) {}
}

describe('Resolution', () => {
    it('should create new instance with class binding', async () => {
        const token = Token.for<Counter>('Counter');
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(token).toClass(Counter).asTransient());
        const container = builder.build();

        const instance = await container.resolve(token);

        expect(instance).toBeInstanceOf(Counter);
    });

    it('should create new instance with factory binding', async () => {
        const builder = new ContainerBuilder();
        builder.register(b =>
            b
                .bind(Counter)
                .toFactory(() => new Counter())
                .asTransient()
        );
        const container = builder.build();

        const instance = await container.resolve(Counter);

        expect(instance).toBeInstanceOf(Counter);
    });

    it('should create new instance with value binding', async () => {
        const counter = new Counter();
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(Counter).toValue(counter).asTransient());
        const container = builder.build();

        expect(await container.resolve(Counter)).toBe(counter);
    });

    it('should create new instance with factory has container resolve', async () => {
        const counter = new Counter();
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(Counter).toValue(counter).asSingleton());
        builder.register(b =>
            b
                .bind(Service)
                .toFactory(async container => new Service(await container.resolve(Counter)))
                .asTransient()
        );
        const container = builder.build();

        const instance = await container.resolve(Service);

        expect(instance).toBeInstanceOf(Service);
        expect(instance.counter).toBe(counter);
    });

    it('should throw error when resolve unregistered class', async () => {
        const builder = new ContainerBuilder();
        builder.register(b => b.bind(Counter).toClass(Counter).asTransient());
        const container = builder.build();

        await expect(container.resolve(Service)).rejects.toThrow();
    });
});
