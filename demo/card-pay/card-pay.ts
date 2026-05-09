import { createFetchBackendAdapter, createPasskeyClient, decrypt, encrypt } from '../../src/index';

type CardBrand = 'Visa' | 'Mastercard';

interface CardFormData {
    cardNumber: string;
    expirationMonth: string;
    expirationYear: string;
    cvc: string;
    cardHolderName?: string;
    email?: string;
}

type ParsedCardForm = CardFormData & {
    brand: CardBrand;
    last4: string;
    expiry: string;
};

type StoredCardObject = {
    encryptedCard: string;
    brand: CardBrand;
    last4: string;
    expiry: string;
};

const logs = getElement<HTMLPreElement>('logs');
const status = getElement<HTMLParagraphElement>('status');
const storedCardObject = getElement<HTMLTextAreaElement>('storedCardObject');

const threeDsBtn = getElement<HTMLButtonElement>('threeDsBtn');
const saveCardBtn = getElement<HTMLButtonElement>('saveCardBtn');
const payBtn = getElement<HTMLButtonElement>('payBtn');
const clearCardBtn = getElement<HTMLButtonElement>('clearCardBtn');
const clearLogsBtn = getElement<HTMLButtonElement>('clearLogsBtn');

const threeDsModal = getElement<HTMLDivElement>('threeDsModal');
const threeDsText = getElement<HTMLParagraphElement>('threeDsText');
const approveThreeDsBtn = getElement<HTMLButtonElement>('approveThreeDsBtn');
const declineThreeDsBtn = getElement<HTMLButtonElement>('declineThreeDsBtn');

const paymentResultModal = getElement<HTMLDivElement>('paymentResultModal');
const paymentResultTitle = getElement<HTMLHeadingElement>('paymentResultTitle');
const paymentResultText = getElement<HTMLParagraphElement>('paymentResultText');
const closePaymentResultBtn = getElement<HTMLButtonElement>('closePaymentResultBtn');

let isBusy = false;
let is3DsCompleted = false;
let threeDsFingerprint: string | null = null;
let hasSavedCard = false;

closePaymentResultBtn.addEventListener('click', closePaymentResultModal);
paymentResultModal.addEventListener('click', (event) => {
    if (event.target === paymentResultModal) {
        closePaymentResultModal();
    }
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closePaymentResultModal();
    }
});

threeDsBtn.addEventListener('click', () => {
    void runAction('3ds-mock', async () => {
        // Знімаємо поточний валідований snapshot картки для 3DS-челенджу.
        const card = readCardForm();
        // Запускаємо модальне 3DS-підтвердження і чекаємо рішення користувача.
        const approved = await runThreeDsMock(card);
        if (!approved) {
            throw new Error('3DS mock declined.');
        }

        // Фіксуємо, що 3DS пройдено для поточного snapshot реквізитів.
        is3DsCompleted = true;
        // Прив'язуємо 3DS до конкретних полів картки, суми та валюти.
        threeDsFingerprint = buildThreeDsFingerprint(card);
        setStatus('3DS mock completed.', 'ok');
        syncButtons();

        return {
            approved: true,
            reference: threeDsFingerprint,
        };
    });
});

saveCardBtn.addEventListener('click', () => {
    void runAction('save-card-with-passkey', async () => {
        // Пере-зчитуємо картку перед збереженням токена, щоб працювати з актуальними даними.
        const card = readCardForm();
        // Не даємо зберегти токен без валідного 3DS для цього ж snapshot.
        ensure3DsForCurrentCard(card);

        // Step-up через passkey перед операцією збереження картки.
        await ensurePasskeyAuthenticated('save-card');

        // Шифруємо картку і будуємо безпечний об'єкт з masked-метаданими.
        const tokenObject = await buildStoredCardObject(card);
        // Зберігаємо токен саме для поточного користувача.
        saveCardForCurrentUser(tokenObject);
        // Відображаємо збережений об'єкт для демонстрації результату.
        renderStoredCardObject(tokenObject);

        // Після збереження вважаємо, що токен існує, а попередній 3DS snapshot спожито.
        hasSavedCard = true;
        is3DsCompleted = false;
        threeDsFingerprint = null;
        setStatus('Card token encrypted and saved with passkey authorization.', 'ok');
        syncButtons();

        return tokenObject;
    });
});

payBtn.addEventListener('click', () => {
    void runAction('pay-with-passkey', async () => {
        // Дістаємо раніше збережений токен картки для поточного username.
        const tokenObject = getSavedCardForCurrentUser();
        if (!tokenObject) {
            throw new Error('No saved card token for current user.');
        }

        // Перед списанням завжди вимагаємо актуальне passkey-підтвердження.
        await ensurePasskeyAuthenticated('pay');

        // Розшифровуємо payload токена лише після успішного step-up.
        const decryptedCard = await decrypt<CardFormData>(tokenObject.encryptedCard);
        // Беремо суму з UI і нормалізуємо до числа для mock-авторизації.
        const amountMinor = Number(getValue('amountMinor'));
        // Мінімальна перевірка цілісності: валідна сума + збіг last4 з розшифрованою карткою.
        const isSuccessful = Number.isFinite(amountMinor) && amountMinor > 0 && decryptedCard.cardNumber.endsWith(tokenObject.last4);

        if (!isSuccessful) {
            showPaymentResult(false, 'Payment could not be completed.');
            throw new Error('Payment declined by mock processor.');
        }

        // Нормалізуємо валюту для консистентного відображення і відповіді.
        const currency = getValue('currency').toUpperCase();
        showPaymentResult(true, `Paid ${amountMinor} ${currency} with ${tokenObject.brand} ****${tokenObject.last4}.`);
        setStatus('Payment completed via passkey (no 3DS).', 'ok');

        return {
            ok: true,
            amountMinor,
            currency,
            brand: tokenObject.brand,
            last4: tokenObject.last4,
        };
    });
});

clearCardBtn.addEventListener('click', () => {
    clearSavedCardForCurrentUser();
    storedCardObject.value = '';
    hasSavedCard = false;
    is3DsCompleted = false;
    threeDsFingerprint = null;
    setStatus('Saved card token removed.', 'ok');
    syncButtons();
    appendLog('Saved card cleared.');
});

clearLogsBtn.addEventListener('click', () => {
    logs.textContent = '';
    resetStatus();
    appendLog('Logs cleared.');
});

const reactiveInputIds = ['username', 'cardNumber', 'cardExpiry', 'cardCvv', 'cardholder', 'amountMinor', 'currency', 'merchantId'] as const;

for (const id of reactiveInputIds) {
    getElement<HTMLInputElement>(id).addEventListener('input', () => {
        if (id === 'username') {
            loadSavedCardForCurrentUser();
            return;
        }

        if (threeDsFingerprint && !matchesThreeDsFingerprintSafe()) {
            is3DsCompleted = false;
            threeDsFingerprint = null;
            setStatus('Card data changed. Repeat 3DS mock.', 'pending');
        }

        syncButtons();
    });
}

appendLog('Card payment demo ready.');
appendLog('Run backend: npm run server:device');
appendLog('Open this page: http://localhost:5173/card-pay.html');
loadSavedCardForCurrentUser();
syncButtons();

/**
 * Creates passkey client for real-device flow.
 */
function createClient() {
    // Adapter ізолює HTTP-контракт до backend options/verify endpoint'ів.
    const adapter = createFetchBackendAdapter({
        baseUrl: getValue('apiUrl'),
        defaultHeaders: {
            'x-demo-client': 'passkey-card-pay-demo',
        },
    });

    // SDK-клієнт оркеструє passkey-церемонії поверх adapter без прямого fetch у UI.
    return createPasskeyClient({ adapter });
}

/**
 * Ensures user has passkey and performs passkey authentication.
 */
async function ensurePasskeyAuthenticated(reason: string): Promise<void> {
    // Піднімаємо клієнт для одного auth-кроку в межах поточної дії.
    const client = createClient();
    // Username використовується backend'ом для пошуку credentials і policy checks.
    const username = getUsername();

    // Якщо локальної позначки реєстрації немає, робимо auto-register для демо.
    if (getRegisteredPasskeyUser() !== username.toLowerCase()) {
        appendLog('No local passkey enrollment marker. Running registration first.');
        // Реєстраційна церемонія: begin options -> navigator.credentials.create -> verify.
        await client.register({
            user: {
                id: getValue('userId'),
                username,
                displayName: getValue('displayName'),
            },
            context: {
                source: 'card-pay-demo',
                flow: 'auto-register',
            },
            riskSignals: {
                trustedDevice: true,
            },
        });

        // Кешуємо маркер, щоб не реєструвати passkey повторно при кожній дії.
        setRegisteredPasskeyUser(username);
    }

    // Перед запуском assertion показуємо очікування на взаємодію з автентифікатором.
    setStatus('Waiting for passkey verification...', 'pending');
    // Логін-церемонія: begin options -> navigator.credentials.get -> verify.
    const loginResult = await client.login({
        username,
        context: {
            source: 'card-pay-demo',
            flow: reason,
            userId: getValue('userId'),
        },
        riskSignals: {
            trustedDevice: true,
        },
    });

    if (!loginResult.verified) {
        throw new Error('Passkey authentication failed.');
    }
}

/**
 * Runs a 3DS mock challenge in modal dialog.
 */
async function runThreeDsMock(card: ParsedCardForm): Promise<boolean> {
    // Контекст челенджу (сума/валюта) беремо з UI на момент запуску 3DS.
    const amountMinor = Number(getValue('amountMinor'));
    const currency = getValue('currency').toUpperCase();

    // Показуємо користувачу деталі челенджу для підтвердження/відхилення.
    threeDsText.textContent = `Challenge ${card.brand} ****${card.last4} for ${amountMinor} ${currency}. Approve?`;
    threeDsModal.classList.remove('hidden');
    document.body.classList.add('modal-open');

    // Очікуємо одноразове рішення з модалки і перетворюємо його на boolean результат.
    const decision = await new Promise<boolean>((resolve) => {
        const onApprove = () => resolve(true);
        const onDecline = () => resolve(false);

        approveThreeDsBtn.addEventListener('click', onApprove, { once: true });
        declineThreeDsBtn.addEventListener('click', onDecline, { once: true });
    });

    threeDsModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    return decision;
}

/**
 * Builds stored object with required fields.
 */
async function buildStoredCardObject(card: ParsedCardForm): Promise<StoredCardObject> {
    // Шифруємо повні реквізити; у відкритому вигляді залишаємо лише безпечні метадані.
    const encryptedCard = await encrypt<CardFormData>({
        cardNumber: card.cardNumber,
        expirationMonth: card.expirationMonth,
        expirationYear: card.expirationYear,
        cvc: card.cvc,
        ...(card.cardHolderName ? { cardHolderName: card.cardHolderName } : {}),
    });

    return {
        encryptedCard,
        brand: card.brand,
        last4: card.last4,
        expiry: card.expiry,
    };
}

/**
 * Ensures 3DS was completed for the current card snapshot.
 */
function ensure3DsForCurrentCard(card: ParsedCardForm): void {
    if (!is3DsCompleted || !threeDsFingerprint) {
        throw new Error('Complete 3DS mock before saving card token.');
    }

    // Блокуємо збереження, якщо після 3DS змінилися критичні поля або контекст платежу.
    if (buildThreeDsFingerprint(card) !== threeDsFingerprint) {
        throw new Error('Card data changed after 3DS mock. Repeat step 2.');
    }
}

/**
 * Creates deterministic fingerprint for 3DS card snapshot.
 */
function buildThreeDsFingerprint(card: ParsedCardForm): string {
    return `${card.cardNumber}|${card.expirationMonth}|${card.expirationYear}|${card.cardHolderName ?? ''}|${getValue('amountMinor')}|${getValue('currency').toUpperCase()}`;
}

/**
 * Returns whether current card input still matches stored 3DS snapshot.
 */
function matchesThreeDsFingerprintSafe(): boolean {
    try {
        return Boolean(threeDsFingerprint) && buildThreeDsFingerprint(readCardForm()) === threeDsFingerprint;
    } catch {
        return false;
    }
}

/**
 * Reads and validates card fields from UI.
 */
function readCardForm(): ParsedCardForm {
    const number = normalizeCardNumber(getValue('cardNumber'));
    const expiry = getValue('cardExpiry').trim();
    const cvv = getValue('cardCvv').trim();
    const cardholder = getValue('cardholder').trim();

    if (!number || number.length < 12) {
        throw new Error('Card number is invalid.');
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        throw new Error('Expiry must be in MM/YY format.');
    }

    const [expirationMonth, expirationYearShort] = expiry.split('/');
    if (!expirationMonth || !expirationYearShort) {
        throw new Error('Expiry must be in MM/YY format.');
    }

    const month = Number(expirationMonth);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw new Error('Expiry month is invalid.');
    }

    if (!/^\d{3,4}$/.test(cvv)) {
        throw new Error('CVV is invalid.');
    }

    if (!cardholder) {
        throw new Error('Cardholder name is required.');
    }

    const brand = detectCardBrand(number);
    if (!brand) {
        throw new Error('Only Visa and Mastercard are supported in this demo.');
    }

    return {
        cardNumber: number,
        expirationMonth,
        expirationYear: `20${expirationYearShort}`,
        cvc: cvv,
        cardHolderName: cardholder,
        expiry,
        brand,
        last4: number.slice(-4),
    };
}

/**
 * Detects supported card brand from PAN.
 */
function detectCardBrand(number: string): CardBrand | null {
    if (/^4\d{12}(\d{3})?(\d{3})?$/.test(number)) {
        return 'Visa';
    }

    if (/^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7[01]\d{12}|720\d{12}))$/.test(number)) {
        return 'Mastercard';
    }

    return null;
}

/**
 * Normalizes card number by stripping non-digits.
 */
function normalizeCardNumber(raw: string): string {
    return raw.replace(/\D/g, '');
}

/**
 * Saves card token object for current username.
 */
function saveCardForCurrentUser(value: StoredCardObject): void {
    localStorage.setItem(getCardStorageKey(getUsername()), JSON.stringify(value));
}

/**
 * Loads saved card token for current user.
 */
function getSavedCardForCurrentUser(): StoredCardObject | null {
    const raw = localStorage.getItem(getCardStorageKey(getUsername()));
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as StoredCardObject;
    } catch {
        return null;
    }
}

/**
 * Clears saved card token for current user.
 */
function clearSavedCardForCurrentUser(): void {
    localStorage.removeItem(getCardStorageKey(getUsername()));
}

/**
 * Refreshes UI state from existing saved card object.
 */
function loadSavedCardForCurrentUser(): void {
    // Підтягуємо токен картки для поточного username при перемиканні користувача/оновленні сторінки.
    const saved = getSavedCardForCurrentUser();
    // Прапорець керує доступністю pay/clear кнопок.
    hasSavedCard = Boolean(saved);

    if (saved) {
        renderStoredCardObject(saved);
        setStatus(`Saved card token loaded: ${saved.brand} ****${saved.last4}.`, 'ok');
    } else {
        storedCardObject.value = '';
    }

    is3DsCompleted = false;
    threeDsFingerprint = null;
    syncButtons();
}

/**
 * Renders stored card object to readonly textarea.
 */
function renderStoredCardObject(value: StoredCardObject): void {
    storedCardObject.value = JSON.stringify(value, null, 2);
}

/**
 * Returns localStorage key for saved card token.
 */
function getCardStorageKey(username: string): string {
    return `passkey.demo.cardPay.savedCard.${username.toLowerCase()}`;
}

/**
 * Shows payment result modal with required statuses.
 */
function showPaymentResult(isSuccess: boolean, message: string): void {
    paymentResultTitle.textContent = isSuccess ? 'OK' : 'Відмова';
    paymentResultTitle.className = isSuccess ? 'modal-ok' : 'modal-error';
    paymentResultText.textContent = message;

    paymentResultModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

/**
 * Closes payment result modal.
 */
function closePaymentResultModal(): void {
    paymentResultModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
}

/**
 * Runs action and writes logs.
 */
async function runAction(name: string, handler: () => Promise<unknown>): Promise<void> {
    appendLog(`> ${name}: started`);

    try {
        setBusy(true);
        const result = await handler();
        appendLog(`> ${name}: success`);
        appendLog(JSON.stringify(result, null, 2));
    } catch (error) {
        appendLog(`> ${name}: failed`);
        appendLog(formatError(error));

        if (name === 'pay-with-passkey') {
            showPaymentResult(false, 'Payment failed.');
        }

        setStatus('Action failed. Check logs.', 'error');
    } finally {
        setBusy(false);
    }
}

/**
 * Updates busy state and controls button availability.
 */
function setBusy(value: boolean): void {
    isBusy = value;
    syncButtons();
}

/**
 * Syncs action button states.
 */
function syncButtons(): void {
    const cardReady = isCardInputValid();

    threeDsBtn.disabled = isBusy || !cardReady;
    saveCardBtn.disabled = isBusy || !cardReady || !is3DsCompleted;
    payBtn.disabled = isBusy || !hasSavedCard;
    clearCardBtn.disabled = isBusy || !hasSavedCard;
}

/**
 * Returns whether card input is valid without throwing.
 */
function isCardInputValid(): boolean {
    try {
        readCardForm();
        return true;
    } catch {
        return false;
    }
}

/**
 * Gets username from UI.
 */
function getUsername(): string {
    const username = getValue('username').trim();
    if (!username) {
        throw new Error('Username is required.');
    }

    return username;
}

/**
 * Saves local marker that user has passkey registration.
 */
function setRegisteredPasskeyUser(username: string): void {
    localStorage.setItem('passkey.demo.cardPay.registeredUser', username.toLowerCase());
}

/**
 * Returns local marker of passkey registration user.
 */
function getRegisteredPasskeyUser(): string | null {
    return localStorage.getItem('passkey.demo.cardPay.registeredUser');
}

/**
 * Appends message to log panel.
 */
function appendLog(message: string): void {
    logs.textContent = `${logs.textContent ?? ''}${message}\n`;
    logs.scrollTop = logs.scrollHeight;
}

/**
 * Sets status label text and tone.
 */
function setStatus(message: string, tone: 'ok' | 'pending' | 'error'): void {
    status.textContent = message;
    status.className =
        tone === 'ok' ? 'status-ok'
        : tone === 'pending' ? 'status-pending'
        : 'status-error';
}

/**
 * Resets status text and style to initial neutral state.
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
 * Reads input value by id.
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
