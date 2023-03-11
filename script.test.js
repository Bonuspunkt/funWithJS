function creteMockFn() {
    const calls = [];

    const mock = (...args) => calls.push(args);
    Object.defineProperties(mock, {
        called: { get() { return calls.length } },
        arguments: { get() { return calls.slice() } }
    });
    return mock;
}

function mockSetTimeout() {
    let fn, timeout

    const mock = (...args) => [fn, timeout] = args;
    Object.defineProperties(mock, {
        fn: { get() { return fn; } },
        timeout: { get() { return timeout; } }
    });
    return mock;
}

const setupHandler = () => {
    const enqueuePayment = creteMockFn();
    const enqueueDispense = creteMockFn();
    const setTimeout = mockSetTimeout();

    const handler = createHandler({
        enqueuePayment,
        enqueueDispense,
        setTimeout
    });

    return { enqueuePayment, enqueueDispense, setTimeout, handler }
}


(() => {
    // everything fine
    const { enqueuePayment, enqueueDispense, handler } = setupHandler();

    console.assert(handler.state === STATES.IDLE);

    handler('1');

    console.assert(handler.state === STATES.FIRST_DIGIT);

    handler('2');

    console.assert(handler.state === STATES.PAYMENT);
    console.assert(enqueuePayment.called === 1);
    console.assert(enqueuePayment.arguments[0].length === 1);
    console.assert(enqueuePayment.arguments[0][0] === 12);

    handler('PAYMENT_SUCCEEDED');

    console.assert(handler.state === STATES.DISPENSE);
    console.assert(enqueueDispense.called === 1);
    console.assert(enqueueDispense.arguments[0].length === 1);
    console.assert(enqueueDispense.arguments[0][0] === 12);

    handler('PRODUCT_DISPENSED');

    console.assert(handler.state === STATES.IDLE);
})();

(() => {
    // payment fails
    const { enqueuePayment, handler } = setupHandler();

    console.assert(handler.state === STATES.IDLE);

    handler('5');

    console.assert(handler.state === STATES.FIRST_DIGIT);

    handler('7');

    console.assert(handler.state === STATES.PAYMENT);
    console.assert(enqueuePayment.called === 1);
    console.assert(enqueuePayment.arguments[0].length === 1);
    console.assert(enqueuePayment.arguments[0][0] === 57);

    handler('PAYMENT_FAILED');

    console.assert(handler.state === STATES.IDLE);
})();


(() => {
    // fail fast
    const { handler } = setupHandler();

    console.assert(handler.state === STATES.IDLE);

    handler('oh hi');

    console.assert(handler.state === STATES.OUT_OF_ORDER);
})();

(() => {
    // timeout after first digit
    const { handler, setTimeout } = setupHandler();

    console.assert(handler.state === STATES.IDLE);

    handler('1');

    console.assert(handler.state === STATES.FIRST_DIGIT);

    setTimeout.fn();

    console.assert(handler.state === STATES.IDLE);
})();

(() => {
    // ignores numbers starting with 0
    const { handler } = setupHandler();

    console.assert(handler.state === STATES.IDLE);
    handler('0');
    console.assert(handler.state === STATES.IDLE);
})()