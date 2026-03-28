import { describe, it, expect } from 'vitest';
import { ContainerBuilder } from '../../src/container/ContainerBuilder.js';
import { IDependencyContainer } from '../../src/container/IDependencyContainer.js';

// Interface definitions
interface ILogger {
    log(message: string): void;
    getLogs(): string[];
}

interface IConfig {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
}

// Implementation classes
class ConsoleLogger implements ILogger {
    private logs: string[] = [];

    log(message: string): void {
        this.logs.push(message);
        console.log(message);
    }

    getLogs(): string[] {
        return [...this.logs];
    }
}

class FileLogger implements ILogger {
    private logs: string[] = [];
    private filename: string;

    constructor(filename: string = 'app.log') {
        this.filename = filename;
    }

    log(message: string): void {
        this.logs.push(message);
        // In real implementation, would write to file
    }

    getLogs(): string[] {
        return [...this.logs];
    }
}

class InMemoryConfig implements IConfig {
    private store = new Map<string, string>();

    get(key: string): string | undefined {
        return this.store.get(key);
    }

    set(key: string, value: string): void {
        this.store.set(key, value);
    }
}

// Service depending on interface
class UserService {
    constructor(
        private logger: ILogger,
        private config: IConfig
    ) {}

    createUser(name: string): void {
        const env = this.config.get('env') ?? 'development';
        this.logger.log(`Creating user ${name} in ${env} environment`);
    }
}

describe('Interface Resolution', () => {
    // Symbol tokens for interfaces
    const ILoggerToken = Symbol.for('ILogger');
    const IConfigToken = Symbol.for('IConfig');

    it('should resolve interface token to implementation', () => {
        const builder = new ContainerBuilder();

        // Bind interface token to implementation
        builder.register(b => b.bind(ILoggerToken).to(ConsoleLogger).asSingleton());

        const container = builder.build();
        const logger = container.resolve(ILoggerToken) as ILogger;

        expect(logger).toBeInstanceOf(ConsoleLogger);
        logger.log('test');
        expect(logger.getLogs()).toContain('test');
    });

    it('should allow swapping implementations', () => {
        const consoleBuilder = new ContainerBuilder();
        consoleBuilder.register(b => b.bind(ILoggerToken).to(ConsoleLogger).asSingleton());
        const consoleContainer = consoleBuilder.build();

        const fileBuilder = new ContainerBuilder();
        fileBuilder.register(b => b.bind(ILoggerToken).to(FileLogger).asSingleton());
        const fileContainer = fileBuilder.build();

        const consoleLogger = consoleContainer.resolve(ILoggerToken) as ILogger;
        const fileLogger = fileContainer.resolve(ILoggerToken) as ILogger;

        expect(consoleLogger).toBeInstanceOf(ConsoleLogger);
        expect(fileLogger).toBeInstanceOf(FileLogger);
    });

    it('should inject interface dependencies into services', () => {
        const builder = new ContainerBuilder();

        // Register interface implementations
        builder.register(b => b.bind(ILoggerToken).to(ConsoleLogger).asSingleton());
        builder.register(b => b.bind(IConfigToken).to(InMemoryConfig).asSingleton());

        // Register service with interface dependencies
        builder.register(b =>
            b
                .bind(UserService)
                .toFactory((c: IDependencyContainer) => {
                    const logger = c.resolve(ILoggerToken) as ILogger;
                    const cfg = c.resolve(IConfigToken) as IConfig;
                    return new UserService(logger, cfg);
                })
                .asTransient()
        );

        const container = builder.build();

        // Configure config on the built container (single build)
        const config = container.resolve(IConfigToken) as IConfig;
        config.set('env', 'production');

        const userService = container.resolve(UserService);

        // Service works with any ILogger/IConfig implementation
        userService.createUser('Alice');

        const logger = container.resolve(ILoggerToken) as ILogger;
        expect(logger.getLogs()[0]).toContain('Alice');
        expect(logger.getLogs()[0]).toContain('production');
    });

    it('should share singleton interface implementations across consumers', () => {
        const builder = new ContainerBuilder();

        builder.register(b => b.bind(ILoggerToken).to(ConsoleLogger).asSingleton());

        const container = builder.build();
        const logger1 = container.resolve(ILoggerToken) as ILogger;
        const logger2 = container.resolve(ILoggerToken) as ILogger;

        // Same singleton instance
        expect(logger1).toBe(logger2);

        logger1.log('message 1');
        logger2.log('message 2');

        // Both see all logs
        expect(logger1.getLogs()).toEqual(['message 1', 'message 2']);
    });

    it('should support multiple interface implementations with different tokens', () => {
        const ConsoleLoggerToken = Symbol.for('ConsoleLogger');
        const FileLoggerToken = Symbol.for('FileLogger');

        const builder = new ContainerBuilder();

        // Register different implementations with different tokens
        builder.register(b => b.bind(ConsoleLoggerToken).to(ConsoleLogger).asSingleton());
        builder.register(b => b.bind(FileLoggerToken).to(FileLogger).asSingleton());

        const container = builder.build();

        const consoleLogger = container.resolve(ConsoleLoggerToken) as ILogger;
        const fileLogger = container.resolve(FileLoggerToken) as ILogger;

        expect(consoleLogger).toBeInstanceOf(ConsoleLogger);
        expect(fileLogger).toBeInstanceOf(FileLogger);

        // Independent singletons
        expect(consoleLogger).not.toBe(fileLogger);
    });

    it('should throw when resolving unregistered interface token', () => {
        const UnregisteredToken = Symbol.for('Unregistered');
        const builder = new ContainerBuilder();
        const container = builder.build();

        expect(() => container.resolve(UnregisteredToken)).toThrow('No binding found for key');
    });

    it('should support string tokens for interfaces', () => {
        const LoggerServiceToken = 'LoggerService';
        const ConfigServiceToken = 'ConfigService';

        const builder = new ContainerBuilder();

        builder.register(b => b.bind(LoggerServiceToken).to(ConsoleLogger).asSingleton());
        builder.register(b => b.bind(ConfigServiceToken).to(InMemoryConfig).asSingleton());

        const container = builder.build();
        const logger = container.resolve(LoggerServiceToken) as ILogger;
        const config = container.resolve(ConfigServiceToken) as IConfig;

        expect(logger).toBeInstanceOf(ConsoleLogger);
        expect(config).toBeInstanceOf(InMemoryConfig);
    });
});
