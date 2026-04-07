import { Binding, Lifetime } from '@/binding/Binding.js';
import { BindingRegistry } from '@/binding/BindingRegistry.js';
import { Factory } from '@/factory/Factory.js';
import { Token } from '@/token/Token.js';
import { describe, expect, it } from 'vitest';

describe('BindingRegistry', () => {
    it('should register and resolve a binding', () => {
        const registry = new BindingRegistry<any>();
        const token = Token.for<string>('test');
        const binding = new Binding(
            token,
            Lifetime.Singleton,
            Factory.sync(() => 'value')
        );

        registry.register(binding);
        expect(registry.resolve(token)).toBe(binding);
    });

    it('should return the last binding when multiple are registered for the same token', () => {
        const registry = new BindingRegistry<any>();
        const token = Token.for<string>('test');
        const binding1 = new Binding(
            token,
            Lifetime.Singleton,
            Factory.sync(() => 'value1')
        );
        const binding2 = new Binding(
            token,
            Lifetime.Singleton,
            Factory.sync(() => 'value2')
        );

        registry.register(binding1);
        registry.register(binding2);

        expect(registry.resolve(token)).toBe(binding2);
    });

    it('should resolveAll bindings for a token', () => {
        const registry = new BindingRegistry<any>();
        const token = Token.for<string>('test');
        const binding1 = new Binding(
            token,
            Lifetime.Singleton,
            Factory.sync(() => 'value1')
        );
        const binding2 = new Binding(
            token,
            Lifetime.Singleton,
            Factory.sync(() => 'value2')
        );

        registry.register(binding1);
        registry.register(binding2);

        const resolvedAll = registry.resolveAll(token);
        expect(resolvedAll).toHaveLength(2);
        expect(resolvedAll).toContain(binding1);
        expect(resolvedAll).toContain(binding2);
    });

    it('should return undefined when resolving a non-existent token', () => {
        const registry = new BindingRegistry<any>();
        const token = Token.for<string>('missing');
        expect(registry.resolve(token)).toBeUndefined();
    });

    it('should return an empty array when resolveAll for a non-existent token', () => {
        const registry = new BindingRegistry<any>();
        const token = Token.for<string>('missing');
        expect(registry.resolveAll(token)).toEqual([]);
    });
});
