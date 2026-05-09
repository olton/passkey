import { createFetchBackendAdapter, createPasskeyClient, type BeginRegistrationInput, type BeginPaymentStepUpInput, StepUpDecision } from '../../src/index';

const logs = getElement<HTMLPreElement>('logs');
const status = getElement<HTMLParagraphElement>('status');
const stateAccountVerified = getElement<HTMLParagraphElement>('stateAccountVerified');
const stateFirstPayment = getElement<HTMLParagraphElement>('stateFirstPayment');
const statePasskeyEnrolled = getElement<HTMLParagraphElement>('statePasskeyEnrolled');

const verifyAccountBtn = getElement<HTMLButtonElement>('verifyAccountBtn');
const completeFirstPaymentBtn = getElement<HTMLButtonElement>('completeFirstPaymentBtn');
const enrollPasskeyBtn = getElement<HTMLButtonElement>('enrollPasskeyBtn');
const runLifecycleBtn = getElement<HTMLButtonElement>('runLifecycleBtn');
const confirmPaymentBtn = getElement<HTMLButtonElement>('confirmPaymentBtn');
const suggest3dsBtn = getElement<HTMLButtonElement>('suggest3dsBtn');
const suggestEnrollBtn = getElement<HTMLButtonElement>('suggestEnrollBtn');
const clearLogsBtn = getElement<HTMLButtonElement>('clearLogsBtn');

interface LifecycleState {
    accountVerified: boolean;
    firstPaymentCompleted: boolean;
    passkeyEnrolled: boolean;
}

const lifecycleState: LifecycleState = {
    accountVerified: false,
    firstPaymentCompleted: false,
    passkeyEnrolled: false,
};

verifyAccountBtn.addEventListener('click', () => {
    void runAction('verify-account-otp', async () => {
        await verifyAccountWithOtpMock();
        return {
            accountVerified: lifecycleState.accountVerified,
        };
    });
});

completeFirstPaymentBtn.addEventListener('click', () => {
    void runAction('complete-first-account-payment', async () => {
        await completeFirstAccountPaymentMock();
        return {
            firstPaymentCompleted: lifecycleState.firstPaymentCompleted,
        };
    });
});

enrollPasskeyBtn.addEventListener('click', () => {
    void runAction('enroll-account-passkey', async () => {
        const result = await enrollAccountPasskey();
        return {
            passkeyEnrolled: lifecycleState.passkeyEnrolled,
            registration: result,
        };
    });
});

runLifecycleBtn.addEventListener('click', () => {
    void runAction('run-full-first-payment-lifecycle', async () => {
        await verifyAccountWithOtpMock();
        await completeFirstAccountPaymentMock();
        const registrationResult = await enrollAccountPasskey();

        return {
            accountVerified: lifecycleState.accountVerified,
            firstPaymentCompleted: lifecycleState.firstPaymentCompleted,
            passkeyEnrolled: lifecycleState.passkeyEnrolled,
            registrationResult,
        };
    });
});

confirmPaymentBtn.addEventListener('click', () => {
    void runAction('confirm-payment', async () => {
        const client = createClient();
        const input = buildPaymentInput();
        const result = await client.confirmPayment(input);

        if (result.decision === StepUpDecision.EnrollmentRequired) {
            setStatus('Enrollment required by backend policy. Use mandatory enrollment flow or allowed fallback strategy.', 'pending');
        } else if (result.decision === StepUpDecision.FallbackTo3DS) {
            setStatus('Passkey did not approve payment. Trigger 3DS fallback.', 'pending');
        } else if (result.decision === StepUpDecision.Approved) {
            setStatus(lifecycleState.passkeyEnrolled ? 'Payment approved by passkey step-up.' : 'Payment approved. Optional: suggest passkey enrollment for next payments.', 'ok');
        } else {
            setStatus(`Payment decision: ${result.decision}`, 'pending');
        }

        return result;
    });
});

suggest3dsBtn.addEventListener('click', () => {
    getElement<HTMLInputElement>('amountMinor').value = '120000';
    setStatus('Amount set above threshold to trigger fallback_to_3ds in demo backend.', 'pending');
});

suggestEnrollBtn.addEventListener('click', () => {
    getElement<HTMLInputElement>('accountId').value = 'unenrolled_click2pay_demo';
    resetLifecycleState();
    persistLifecycleState();
    renderLifecycleState();
    setStatus('Account ID set to unenrolled_* to trigger enrollment-required branch.', 'pending');
});

clearLogsBtn.addEventListener('click', () => {
    logs.textContent = '';
    resetStatus();
    appendLog('Logs cleared.');
});

appendLog('Payment step-up demo ready.');
appendLog('Run backend: npm run server:device');
appendLog('Open this page: http://localhost:5173/payment-step-up/index.html');
hydrateLifecycleState();
renderLifecycleState();

getElement<HTMLInputElement>('username').addEventListener('input', onIdentityChanged);
getElement<HTMLInputElement>('accountId').addEventListener('input', onIdentityChanged);

/**
 * Creates passkey client for payment-step-up demo.
 */
function createClient() {
    const adapter = createFetchBackendAdapter({
        baseUrl: getValue('apiUrl'),
        defaultHeaders: {
            'x-demo-client': 'passkey-payment-step-up-demo',
        },
    });

    return createPasskeyClient({ adapter });
}

/**
 * Executes account verification step (OTP mock).
 */
async function verifyAccountWithOtpMock(): Promise<void> {
    const username = getRequiredUsername();

    setStatus('Running account verification (OTP mock)...', 'pending');
    appendLog(`Verifying account identity for ${username} via OTP mock...`);
    await Promise.resolve();

    lifecycleState.accountVerified = true;
    persistLifecycleState();
    renderLifecycleState();
    setStatus('Account verification step completed.', 'ok');
}

/**
 * Executes first account payment policy step (mock).
 */
async function completeFirstAccountPaymentMock(): Promise<void> {
    if (!lifecycleState.accountVerified) {
        throw new Error('Run account verification (OTP) before first account payment step.');
    }

    const amountMinor = Number(getValue('amountMinor'));
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
        throw new Error('Amount must be a positive number for first payment step.');
    }

    setStatus('Completing first account payment policy step (mock)...', 'pending');
    appendLog(`First account payment lifecycle step completed for amount ${amountMinor}.`);
    await Promise.resolve();

    lifecycleState.firstPaymentCompleted = true;
    persistLifecycleState();
    renderLifecycleState();
    setStatus('First account payment step completed.', 'ok');
}

/**
 * Enrolls passkey for payment account after first lifecycle steps.
 */
async function enrollAccountPasskey() {
    if (!lifecycleState.accountVerified || !lifecycleState.firstPaymentCompleted) {
        throw new Error('Complete OTP + first account payment step before passkey enrollment.');
    }

    const client = createClient();
    const registrationInput = buildRegistrationInput();

    setStatus('Running account-level passkey enrollment...', 'pending');
    const result = await client.register(registrationInput);

    lifecycleState.passkeyEnrolled = true;
    convertAccountIdToEnrolledVariant();
    persistLifecycleState();
    renderLifecycleState();
    setStatus('Account passkey enrollment completed. You can confirm payment now.', 'ok');

    return result;
}

/**
 * Builds payment step-up input from UI controls.
 */
function buildPaymentInput(): BeginPaymentStepUpInput {
    const amountMinor = Number(getValue('amountMinor'));
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
        throw new Error('Amount must be a positive number.');
    }

    const paymentIntentId = getValue('paymentIntentId').trim();
    const merchantId = getValue('merchantId').trim();
    const accountId = getValue('accountId').trim();
    const currency = getValue('currency').trim().toUpperCase();

    if (!paymentIntentId) {
        throw new Error('Payment Intent ID is required.');
    }

    if (!merchantId) {
        throw new Error('Merchant ID is required.');
    }

    if (!currency) {
        throw new Error('Currency is required.');
    }

    const username = getRequiredUsername();

    return {
        payment: {
            paymentIntentId,
            amountMinor,
            currency,
            merchantId,
            ...(accountId ? { accountId } : {}),
        },
        ...(username ? { userId: username.toLowerCase() } : {}),
        context: {
            source: 'payment-step-up-demo',
            flow: 'confirm-payment',
            username,
        },
        riskSignals: {
            trustedDevice: true,
        },
    };
}

/**
 * Builds registration payload for account passkey enrollment.
 */
function buildRegistrationInput(): BeginRegistrationInput {
    const username = getRequiredUsername();
    const accountId = getValue('accountId').trim();

    return {
        user: {
            id: deriveUserId(username, accountId),
            username,
            displayName: getValue('displayName').trim() || 'Payment Demo User',
        },
        context: {
            source: 'payment-step-up-demo',
            flow: 'account-passkey-enrollment',
            accountId,
        },
        riskSignals: {
            trustedDevice: true,
        },
    };
}

/**
 * Runs named demo action and writes logs.
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
 * Updates busy state and buttons.
 */
function setBusy(value: boolean): void {
    verifyAccountBtn.disabled = value;
    completeFirstPaymentBtn.disabled = value;
    enrollPasskeyBtn.disabled = value;
    runLifecycleBtn.disabled = value;
    confirmPaymentBtn.disabled = value;
    suggest3dsBtn.disabled = value;
    suggestEnrollBtn.disabled = value;
    clearLogsBtn.disabled = value;
}

/**
 * Reacts to username/account changes by loading or resetting lifecycle state.
 */
function onIdentityChanged(): void {
    hydrateLifecycleState();
    renderLifecycleState();
}

/**
 * Loads lifecycle state from local storage for current identity key.
 */
function hydrateLifecycleState(): void {
    const key = getLifecycleStorageKey();
    if (!key) {
        resetLifecycleState();
        return;
    }

    const raw = localStorage.getItem(key);
    if (!raw) {
        resetLifecycleState();
        return;
    }

    try {
        const parsed = JSON.parse(raw) as Partial<LifecycleState>;
        lifecycleState.accountVerified = parsed.accountVerified === true;
        lifecycleState.firstPaymentCompleted = parsed.firstPaymentCompleted === true;
        lifecycleState.passkeyEnrolled = parsed.passkeyEnrolled === true;
    } catch {
        resetLifecycleState();
    }
}

/**
 * Persists lifecycle state for current identity key.
 */
function persistLifecycleState(): void {
    const key = getLifecycleStorageKey();
    if (!key) {
        return;
    }

    localStorage.setItem(key, JSON.stringify(lifecycleState));
}

/**
 * Resets lifecycle step flags.
 */
function resetLifecycleState(): void {
    lifecycleState.accountVerified = false;
    lifecycleState.firstPaymentCompleted = false;
    lifecycleState.passkeyEnrolled = false;
}

/**
 * Renders lifecycle step markers in UI.
 */
function renderLifecycleState(): void {
    renderStep(stateAccountVerified, 'Account verification (OTP)', lifecycleState.accountVerified);
    renderStep(stateFirstPayment, 'First account payment', lifecycleState.firstPaymentCompleted);
    renderStep(statePasskeyEnrolled, 'Account passkey enrollment', lifecycleState.passkeyEnrolled);
}

/**
 * Renders one lifecycle step marker.
 */
function renderStep(element: HTMLParagraphElement, title: string, isDone: boolean): void {
    element.textContent = `${title}: ${isDone ? 'done' : 'pending'}`;
    element.className = isDone ? 'status-ok' : 'status-pending';
}

/**
 * Converts unenrolled account id into enrolled variant after registration.
 */
function convertAccountIdToEnrolledVariant(): void {
    const accountInput = getElement<HTMLInputElement>('accountId');
    const current = accountInput.value.trim();

    if (current.toLowerCase().startsWith('unenrolled_')) {
        accountInput.value = current.replace(/^unenrolled_/i, 'click2pay_');
        appendLog(`Account ID switched to enrolled variant: ${accountInput.value}`);
    }
}

/**
 * Builds localStorage key for lifecycle state per username+account.
 */
function getLifecycleStorageKey(): string | null {
    const username = getValue('username').trim().toLowerCase();
    const accountId = getValue('accountId').trim().toLowerCase();

    if (!username || !accountId) {
        return null;
    }

    return `passkey.demo.paymentStepUp.lifecycle.${username}.${accountId}`;
}

/**
 * Returns required username from form.
 */
function getRequiredUsername(): string {
    const username = getValue('username').trim();
    if (!username) {
        throw new Error('Username is required.');
    }

    return username;
}

/**
 * Derives stable user id from username and account id for demo registration.
 */
function deriveUserId(username: string, accountId: string): string {
    const base = `${username}|${accountId}`.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return `usr_${base}`;
}

/**
 * Appends one message line to log panel.
 */
function appendLog(message: string): void {
    logs.textContent = `${logs.textContent ?? ''}${message}\n`;
    logs.scrollTop = logs.scrollHeight;
}

/**
 * Sets status label tone and text.
 */
function setStatus(message: string, tone: 'ok' | 'pending' | 'error'): void {
    status.textContent = message;
    status.className =
        tone === 'ok' ? 'status-ok'
        : tone === 'pending' ? 'status-pending'
        : 'status-error';
}

/**
 * Resets status to neutral state.
 */
function resetStatus(): void {
    status.textContent = 'Ready';
    status.className = '';
}

/**
 * Converts unknown error into readable string.
 */
function formatError(error: unknown): string {
    if (error instanceof Error) {
        return `${error.name}: ${error.message}`;
    }

    return String(error);
}

/**
 * Reads value by input id.
 */
function getValue(id: string): string {
    return getElement<HTMLInputElement>(id).value;
}

/**
 * Resolves required DOM element.
 */
function getElement<TElement extends Element>(id: string): TElement {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Required element #${id} was not found.`);
    }

    return element as unknown as TElement;
}
