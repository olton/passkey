import {
    CardTokenEnrollmentOutcome,
    createFetchBackendAdapter,
    createPasskeyClient,
    type BeginCardTokenEnrollmentInput,
    type ConfirmCardTokenCheckoutInput,
} from '../../src/index';

const logs = getElement<HTMLPreElement>('logs');
const status = getElement<HTMLParagraphElement>('status');

const paymentSource = getElement<HTMLSelectElement>('paymentSource');
const instrumentType = getElement<HTMLSelectElement>('instrumentType');

const tokenizeCardBtn = getElement<HTMLButtonElement>('tokenizeCardBtn');
const confirmCheckoutBtn = getElement<HTMLButtonElement>('confirmCheckoutBtn');
const enrollPasskeyBtn = getElement<HTMLButtonElement>('enrollPasskeyBtn');
const clearLogsBtn = getElement<HTMLButtonElement>('clearLogsBtn');

let isBusy = false;
let canEnroll = false;

tokenizeCardBtn.addEventListener('click', () => {
    void runAction('tokenize-card-demo', async () => {
        const generated = generateTokenizedInstrumentFromCard();
        instrumentType.value = 'token';
        paymentSource.value = 'tokenized-card';
        setStatus('Demo tokenization completed. Instrument switched to token mode.', 'ok');
        return generated;
    });
});

confirmCheckoutBtn.addEventListener('click', () => {
    void runAction('confirm-card-checkout', async () => {
        const client = createClient();
        const input = buildCheckoutInput();
        const result = await client.confirmCardCheckout(input);

        if (result.authDecision !== 'approved') {
            setStatus(`Auth decision: ${result.authDecision}. Checkout not authorized.`, 'pending');
            canEnroll = false;
            syncButtons();
            return result;
        }

        if (result.gatewayStatus !== 'success') {
            setStatus(`Gateway status: ${result.gatewayStatus ?? 'n/a'}. Payment not completed.`, 'error');
            canEnroll = false;
            syncButtons();
            return result;
        }

        canEnroll = result.shouldOfferEnrollment;
        setStatus(
            canEnroll
                ? 'Checkout success. You can optionally enroll card passkey now.'
                : 'Checkout success. Enrollment offer is not required.',
            'ok',
        );
        syncButtons();

        return result;
    });
});

enrollPasskeyBtn.addEventListener('click', () => {
    void runAction('enroll-card-passkey', async () => {
        const client = createClient();
        const input = buildEnrollmentInput();
        const result = await client.enrollCardPasskey(input);

        if (result.outcome === CardTokenEnrollmentOutcome.Bound) {
            setStatus('Card passkey enrollment completed.', 'ok');
            getElement<HTMLInputElement>('passkeyAlreadyBound').checked = true;
            canEnroll = false;
        } else if (result.outcome === CardTokenEnrollmentOutcome.SkippedByUser) {
            setStatus('Enrollment skipped by user.', 'pending');
        } else {
            setStatus('Enrollment failed.', 'error');
        }

        syncButtons();
        return result;
    });
});

clearLogsBtn.addEventListener('click', () => {
    logs.textContent = '';
    resetStatus();
    appendLog('Logs cleared.');
});

paymentSource.addEventListener('change', syncSourceMode);
instrumentType.addEventListener('change', syncSourceMode);

appendLog('Card service demo ready.');
appendLog('Run backend: npm run server:device');
appendLog('Open this page: http://localhost:5173/card-service/index.html');
syncSourceMode();
syncButtons();

/**
 * Creates passkey client for card service demo.
 */
function createClient() {
    const adapter = createFetchBackendAdapter({
        baseUrl: getValue('apiUrl'),
        defaultHeaders: {
            'x-demo-client': 'passkey-card-service-demo',
        },
    });

    return createPasskeyClient({ adapter });
}

/**
 * Updates instrument mode from selected payment source.
 */
function syncSourceMode(): void {
    const source = paymentSource.value;
    if (source === 'new-card' && instrumentType.value !== 'card') {
        instrumentType.value = 'card';
    }

    if (source === 'tokenized-card' && instrumentType.value !== 'token') {
        instrumentType.value = 'token';
    }
}

/**
 * Generates demo token and fingerprint from card input.
 */
function generateTokenizedInstrumentFromCard(): { tokenId: string; cardFingerprint: string } {
    const cardNumber = normalizeCardNumber(getValue('cardNumber'));
    const expiry = getValue('cardExpiry').trim();

    if (cardNumber.length < 12) {
        throw new Error('Card number is invalid.');
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        throw new Error('Expiry must be in MM/YY format.');
    }

    const last4 = cardNumber.slice(-4);
    const tokenId = `tok_${Date.now()}_${last4}`;
    const cardFingerprint = `fp_${simpleHash(`${cardNumber}|${expiry}`)}`;

    getElement<HTMLInputElement>('tokenId').value = tokenId;
    getElement<HTMLInputElement>('cardFingerprint').value = cardFingerprint;

    appendLog(`Generated tokenId=${tokenId} and cardFingerprint=${cardFingerprint}`);

    return { tokenId, cardFingerprint };
}

/**
 * Builds checkout input from UI controls.
 */
function buildCheckoutInput(): ConfirmCardTokenCheckoutInput {
    return {
        payment: buildPaymentContext(),
        instrument: buildInstrumentRef(),
        userId: getValue('username').trim().toLowerCase(),
        context: {
            source: 'card-service-demo',
            flow: 'confirm-card-checkout',
            paymentSource: paymentSource.value,
            username: getValue('username').trim(),
        },
        riskSignals: {
            trustedDevice: true,
        },
        passkeyAlreadyBound: getElement<HTMLInputElement>('passkeyAlreadyBound').checked,
    };
}

/**
 * Builds enrollment input from UI controls.
 */
function buildEnrollmentInput(): BeginCardTokenEnrollmentInput {
    const username = getValue('username').trim();
    const normalizedUsername = username.toLowerCase();

    return {
        payment: buildPaymentContext(),
        instrument: buildInstrumentRef(),
        user: {
            id: deriveUserId(normalizedUsername),
            username,
            displayName: getValue('displayName').trim() || username,
        },
        context: {
            source: 'card-service-demo',
            flow: 'enroll-card-passkey',
            paymentSource: paymentSource.value,
        },
        riskSignals: {
            trustedDevice: true,
        },
    };
}

/**
 * Builds payment context with validation.
 */
function buildPaymentContext() {
    const paymentIntentId = getValue('paymentIntentId').trim();
    const merchantId = getValue('merchantId').trim();
    const currency = getValue('currency').trim().toUpperCase();
    const amountMinor = Number(getValue('amountMinor'));

    if (!paymentIntentId) {
        throw new Error('Payment Intent ID is required.');
    }

    if (!merchantId) {
        throw new Error('Merchant ID is required.');
    }

    if (!currency) {
        throw new Error('Currency is required.');
    }

    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
        throw new Error('Amount must be a positive number.');
    }

    return {
        paymentIntentId,
        merchantId,
        currency,
        amountMinor,
    };
}

/**
 * Builds payment instrument from selected type.
 */
function buildInstrumentRef(): ConfirmCardTokenCheckoutInput['instrument'] {
    const type = instrumentType.value;

    if (type === 'token') {
        const tokenId = getValue('tokenId').trim();
        if (!tokenId) {
            throw new Error('Token ID is required for token instrument.');
        }

        return {
            type: 'token',
            tokenId,
        };
    }

    if (type === 'card') {
        const cardFingerprint = getValue('cardFingerprint').trim();
        if (!cardFingerprint) {
            throw new Error('Card fingerprint is required for card instrument.');
        }

        return {
            type: 'card',
            cardFingerprint,
        };
    }

    throw new Error(`Unsupported instrument type: ${type}`);
}

/**
 * Runs action with logs.
 */
async function runAction(name: string, handler: () => Promise<unknown>): Promise<void> {
    appendLog(`> ${name}: started`);

    try {
        setBusy(true);
        const result = await handler();
        appendLog(`> ${name}: success`);
        appendLog(JSON.stringify(result, null, 2));
    } catch (error) {
        setStatus('Action failed. Check logs.', 'error');
        appendLog(`> ${name}: failed`);
        appendLog(formatError(error));
    } finally {
        setBusy(false);
    }
}

/**
 * Sets busy flag.
 */
function setBusy(value: boolean): void {
    isBusy = value;
    syncButtons();
}

/**
 * Synchronizes button states.
 */
function syncButtons(): void {
    confirmCheckoutBtn.disabled = isBusy;
    tokenizeCardBtn.disabled = isBusy;
    enrollPasskeyBtn.disabled = isBusy || !canEnroll;
    clearLogsBtn.disabled = isBusy;
}

/**
 * Sets status message.
 */
function setStatus(message: string, tone: 'ok' | 'pending' | 'error'): void {
    status.textContent = message;
    status.dataset['tone'] = tone;
}

/**
 * Resets status block.
 */
function resetStatus(): void {
    status.textContent = 'Ready';
    delete status.dataset['tone'];
}

/**
 * Appends log line.
 */
function appendLog(message: string): void {
    const now = new Date().toISOString();
    const line = `[${now}] ${message}`;
    logs.textContent = logs.textContent ? `${logs.textContent}\n${line}` : line;
}

/**
 * Formats unknown error.
 */
function formatError(error: unknown): string {
    if (error instanceof Error) {
        return `${error.name}: ${error.message}`;
    }

    return `Unknown error: ${String(error)}`;
}

/**
 * Gets input value by id.
 */
function getValue(id: string): string {
    return getElement<HTMLInputElement>(id).value;
}

/**
 * Gets element by id.
 */
function getElement<TElement extends HTMLElement>(id: string): TElement {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Element with id "${id}" was not found.`);
    }

    return element as TElement;
}

/**
 * Creates stable user id from username.
 */
function deriveUserId(username: string): string {
    const sanitized = username.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `card_service_${sanitized || 'user'}`;
}

/**
 * Removes all non-digits from card number.
 */
function normalizeCardNumber(value: string): string {
    return value.replace(/\D/g, '');
}

/**
 * Creates short non-cryptographic hash for demo fingerprint value.
 */
function simpleHash(value: string): string {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }

    return hash.toString(16);
}
