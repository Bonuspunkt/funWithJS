const STATES = {
    IDLE: 1,
    FIRST_DIGIT: 2,
    PAYMENT: 3,
    DISPENSE: 4,
    OUT_OF_ORDER: 5
};
const COMMANDS = {
    DIGIT: 1,
    PAYMENT_SUCCEEDED: 2,
    PAYMENT_FAILED: 3,
    PRODUCT_DISPENSED: 4,
    INVALID: 5
};


function createHandler({
    enqueuePayment,
    enqueueDispense,
    notify = () => { },
    setTimeout = window.setTimeout
}) {
    let firstProductDigit;
    let timeoutId;
    let productId;
    let state = STATES.IDLE;

    function setState(newState) {
        clearTimeout(timeoutId)

        state = newState;

        switch (state) {
            case STATES.IDLE:
                return notify('Please select a product');
            case STATES.PAYMENT:
                return notify('Please complete your payment');
            case STATES.DISPENSE:
                return notify(`Your product ${productId} is on your way`);
            case STATES.OUT_OF_ORDER:
                return notify('Out of Service');
        }
    }

    const transitions = {
        [STATES.IDLE]: {
            [COMMANDS.DIGIT]: stringCommand => {
                firstProductDigit = stringCommand;
                setState(STATES.FIRST_DIGIT);
                timeoutId = setTimeout(() => { setState(STATES.IDLE); }, 1e3)
            }
        },
        [STATES.FIRST_DIGIT]: {
            [COMMANDS.DIGIT]: stringCommand => {
                productId = parseInt(firstProductDigit + stringCommand);
                if (isNaN(productId)) {
                    return setState(STATES.OutOfOrder);
                }

                enqueuePayment(productId);
                setState(STATES.PAYMENT);
            }
        },
        [STATES.PAYMENT]: {
            [COMMANDS.PAYMENT_SUCCEEDED]: async _ => {
                enqueueDispense(productId);
                setState(STATES.DISPENSE);
            },
            [COMMANDS.PAYMENT_FAILED]: _ => {
                setState(STATES.IDLE);
            },
            [COMMANDS.DIGIT]: () => { }
        },
        [STATES.DISPENSE]: {
            [COMMANDS.PRODUCT_DISPENSED]: _ => {
                setState(STATES.IDLE);
            },
            [COMMANDS.DIGIT]: () => { }
        }
    };

    function convertInputToCommand(input) {
        if (/^\d$/.test(input)) {
            return COMMANDS.DIGIT;
        }
        if (COMMANDS[input]) {
            return COMMANDS[input];
        }
        return COMMANDS.INVALID;
    }


    function handler(input) {
        clearTimeout();

        if (input === '0' && state === STATES.IDLE) return;

        const command = convertInputToCommand(input)

        if (transitions[state] &&
            transitions[state][command]) {
            transitions[state][command](input);
        } else {
            setState(STATES.OUT_OF_ORDER);
        }
    }
    Object.defineProperties(handler, {
        state: { get() { return state; } },
    });
    return handler;
};

let autoPlay = true;
const displayEl = document.getElementById('display');
const paymentEl = document.getElementById('payment');
const dispenseEl = document.getElementById('dispense');

function updateDisplay(text) {
    const { textContent } = displayEl;
    displayEl.textContent = [...textContent.split(/\n/).splice(-1), text].join('\n');
}

const handler = createHandler({
    enqueuePayment: productId => {
        paymentEl.textContent = productId;
        autoPlay && setTimeout(() => {
            const success = Math.round(Math.random());
            if (!success) updateDisplay('Payment failed');
            handler(success ? 'PAYMENT_SUCCEEDED' : 'PAYMENT_FAILED');
        }, 500 + 1e3 * Math.random())
    },
    enqueueDispense: productId => {
        dispenseEl.textContent = productId;
        autoPlay && setTimeout(() => {
            updateDisplay(`Dispensed product ${productId}`);
            handler('PRODUCT_DISPENSED');
        }, 500 + 1e3 * Math.random())
    },
    notify: (text) => updateDisplay(text),
});

for (const button of document.querySelectorAll('button')) {
    if (!button.value) {
        button.addEventListener('click', () => {
            autoPlay = !autoPlay;
            button.textContent = autoPlay ? 'enabled' : 'disabled';
        });
        continue;
    }
    button.addEventListener('click', () => handler(button.value));
}
