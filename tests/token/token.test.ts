import { describe, it, expect, vi } from 'vitest';
import { Token } from '@/token/Token.js';

describe('Token', () => {
    it('should create a token with a description using Token.for', () => {
        const description = 'test-token';
        const token = Token.for<string>(description);

        expect(token.description).toBe(description);
        expect(typeof token.identifier).toBe('symbol');
        expect(token.identifier.description).toBe(description);
    });

    it('should create a token from a class using Token.fromClass', () => {
        class TestService {}
        const token = Token.fromClass(TestService);

        expect(token.description).toBe('TestService');
        expect(typeof token.identifier).toBe('symbol');
    });

    it('should cache tokens created from the same class', () => {
        class TestService {}
        const token1 = Token.fromClass(TestService);
        const token2 = Token.fromClass(TestService);

        expect(token1).toBe(token2);
    });

    it('should create unique tokens for different classes', () => {
        class ServiceA {}
        class ServiceB {}
        const tokenA = Token.fromClass(ServiceA);
        const tokenB = Token.fromClass(ServiceB);

        expect(tokenA).not.toBe(tokenB);
    });

    it('should create unique tokens for different calls to Token.for with same description', () => {
        const token1 = Token.for('desc1');
        const token2 = Token.for('desc1');

        expect(token1).not.toBe(token2);
        expect(token1.identifier).not.toBe(token2.identifier);
    });
});
