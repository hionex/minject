import { ContainerBuilder } from './container/ContainerBuilder.js';

class ServiceA {
    constructor(private serviceB: ServiceB) {}
    execute() {
        this.serviceB.hello();
    }
}

class ServiceB {
    constructor() {}
    hello() {
        console.log('Hello World!');
    }
}

function main() {
    const builder = new ContainerBuilder();

    builder
        .register(builder => {
            builder.bind(ServiceB).to(ServiceB).asSingleton();
        })
        .register(builder => {
            builder
                .bind(ServiceA)
                .toFactory(container => new ServiceA(container.resolve<ServiceB>(ServiceB)))
                .asTransient();
        });

    const container = builder.build();
    const serviceB = container.resolve<ServiceB>(ServiceB);
    serviceB.hello();

    const serviceA = container.resolve<ServiceA>(ServiceA);
    serviceA.execute();
}

main();
