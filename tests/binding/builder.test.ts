import { Lifetime } from '@/binding/Binding.js';
import { BindingBuilder } from '@/binding/BindingBuilder.js';
import { BindingKeyNotFoundError } from '@/errors/BindingKeyNotFoundError.js';
import { ImplementationNotFoundError } from '@/errors/ImplementationNotFoundError.js';
import { Token } from '@/token/Token.js';
import { describe, expect, it } from 'vitest';

describe('BindingBuilder', () => {
    it('should set key using Token', () => {
        const token = Token.for<string>('test');
        const builder = new BindingBuilder<string, any>();
        builder.bind(token).toValue('value');

        const binding = builder.build();
        expect(binding.key).toBe(token);
    });

    it('should set key using Class', () => {
        class TestClass {}
        const builder = new BindingBuilder<TestClass, any>();
        builder.bind(TestClass).toClass(TestClass);

        const binding = builder.build();
        expect(binding.key).toBe(Token.fromClass(TestClass));
    });

    it('should set key using String (internally unique)', () => {
        const builder = new BindingBuilder<string, any>();
        builder.bind('test').toValue('value');

        const binding = builder.build();
        expect(binding.key.description).toBe('test');
    });

    it('should set lifetime correctly', () => {
        const token = Token.for<string>('test');
        const builder = new BindingBuilder<string, any>();
        builder.bind(token).toValue('value');

        expect(builder.asSingleton().build().lifetime).toBe(Lifetime.Singleton);
        expect(builder.asScoped().build().lifetime).toBe(Lifetime.Scoped);
        expect(builder.asTransient().build().lifetime).toBe(Lifetime.Transient);
    });

    it('should default to transient lifetime', () => {
        const token = Token.for<string>('test');
        const builder = new BindingBuilder<string, any>();
        builder.bind(token).toValue('value');

        const binding = builder.build();
        expect(binding.lifetime).toBe(Lifetime.Transient);
    });

    it('should throw error when key is not provided', () => {
        const builder = new BindingBuilder<any, any>();
        expect(() => builder.build()).toThrow(BindingKeyNotFoundError);
    });

    it('should throw error when implementation is not provided', () => {
        const token = Token.for<string>('test');
        const builder = new BindingBuilder<string, any>();
        builder.bind(token);
        expect(() => builder.build()).toThrow(ImplementationNotFoundError);
    });

    it('should handle toFactory correctly', async () => {
        const token = Token.for<string>('test');
        const builder = new BindingBuilder<string, any>();
        const factoryFn = (c: any) => 'factory-value';
        builder.bind(token).toFactory(factoryFn);

        const binding = builder.build();
        const result = await binding.factory.create({});
        expect(result).toBe('factory-value');
    });
});
