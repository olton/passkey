import {
  arrayBufferToBase64Url,
  base64UrlToArrayBuffer,
  createFetchBackendAdapter,
  createPasskeyClient,
  uint8ArrayToBase64Url,
} from "../../src/index";

type SensitiveVaultPayload = {
  encryptedData: string;
  iv: string;
  keyMaterial: string;
};

const logs = getElement<HTMLPreElement>("logs");
const status = getElement<HTMLParagraphElement>("status");
const revealedData = getElement<HTMLTextAreaElement>("revealedData");

const registerSensitiveBtn = getElement<HTMLButtonElement>("registerSensitiveBtn");
const hideSensitiveBtn = getElement<HTMLButtonElement>("hideSensitiveBtn");
const revealSensitiveBtn = getElement<HTMLButtonElement>("revealSensitiveBtn");
const clearSensitiveBtn = getElement<HTMLButtonElement>("clearSensitiveBtn");
const clearLogsBtn = getElement<HTMLButtonElement>("clearLogsBtn");

let isBusy = false;
let hasRegisteredPasskey = false;

registerSensitiveBtn.addEventListener("click", () => {
  void runAction("register-passkey", async () => {
    // Створюємо клієнт SDK з adapter до backend API.
    const client = createClient();
    // Беремо username для реєстрації passkey на конкретний акаунт.
    const username = getUsername();

    // Запускаємо registration ceremony: options -> WebAuthn create -> verify.
    const result = await client.register({
      user: {
        id: getUserId(),
        username,
        displayName: getDisplayName(),
      },
      context: {
        source: "sensitive-demo",
        flow: "register",
      },
      riskSignals: {
        trustedDevice: true,
      },
    });

    // Кешуємо користувача для UX і позначаємо локально, що passkey вже зареєстровано.
    cacheLastUser(username);
    cacheRegisteredPasskeyUser(username);
    // Оновлюємо стан UI після успішної реєстрації.
    hasRegisteredPasskey = true;
    syncSensitiveActionButtons();
    setStatus("Passkey registered for sensitive vault.", "ok");
    return result;
  });
});

hideSensitiveBtn.addEventListener("click", () => {
  void runAction("hide-sensitive-data", async () => {
    // Зчитуємо секрет, який потрібно захистити перед збереженням.
    const plainSecret = getSensitiveInput();
    // Вимагаємо актуальну passkey-аутентифікацію для доступу до vault-операції.
    const sessionToken = await authenticateForSensitiveVault();
    // Шифруємо значення на клієнті до відправки на backend.
    const encryptedPayload = await encryptSensitiveValue(plainSecret);

    // Відправляємо лише зашифрований payload і токен сесії.
    const response = await postDemoJson("/demo/sensitive/store", {
      sessionToken,
      username: getUsername(),
      ...encryptedPayload,
    });

    getElement<HTMLTextAreaElement>("sensitiveInput").value = "";
    revealedData.value = "[secret hidden]";
    setStatus("Sensitive data encrypted and hidden.", "ok");
    return response;
  });
});

revealSensitiveBtn.addEventListener("click", () => {
  void runAction("unlock-sensitive-data", async () => {
    // Повторна passkey-перевірка перед розкриттям секретних даних.
    const sessionToken = await authenticateForSensitiveVault();

    // Отримуємо зашифрований payload з backend-сховища.
    const payload = await postDemoJson("/demo/sensitive/reveal", {
      sessionToken,
      username: getUsername(),
    }) as SensitiveVaultPayload;

    // Розшифровуємо локально і показуємо користувачу відкриті дані.
    const decrypted = await decryptSensitiveValue(payload);
    revealedData.value = decrypted;
    setStatus("Sensitive data unlocked after passkey verification.", "ok");

    return {
      ok: true,
      revealedLength: decrypted.length,
    };
  });
});

clearSensitiveBtn.addEventListener("click", () => {
  void runAction("clear-sensitive-data", async () => {
    // Очищення vault теж захищаємо passkey-автентифікацією.
    const sessionToken = await authenticateForSensitiveVault();

    // Викликаємо endpoint видалення даних для поточного користувача.
    const response = await postDemoJson("/demo/sensitive/clear", {
      sessionToken,
      username: getUsername(),
    });

    getElement<HTMLTextAreaElement>("sensitiveInput").value = "";
    revealedData.value = "";
    setStatus("Sensitive data cleared from vault.", "ok");
    return response;
  });
});

clearLogsBtn.addEventListener("click", () => {
  logs.textContent = "";
  resetStatus();
  appendLog("Logs cleared.");
});

getElement<HTMLInputElement>("username").addEventListener("input", () => {
  hasRegisteredPasskey = getRegisteredPasskeyUser() === getUsernameSafe();
  syncSensitiveActionButtons();
});

restoreLastUser();
hasRegisteredPasskey = getRegisteredPasskeyUser() === getUsernameSafe();
syncSensitiveActionButtons();
appendLog("Sensitive demo ready.");
appendLog("Start real backend: npm run server:device");
appendLog("Open this page: http://localhost:5173/sensitive.html");

/**
 * Creates passkey client for this demo page.
 */
function createClient() {
  // Adapter інкапсулює HTTP-контракт з backend (begin/verify для passkey flow).
  const adapter = createFetchBackendAdapter({
    baseUrl: getValue("apiUrl"),
    defaultHeaders: {
      "x-demo-client": "passkey-sensitive-demo",
    },
  });

  // Фасад клієнта централізує register/login церемонії для UI-коду.
  return createPasskeyClient({ adapter });
}

/**
 * Authenticates user with passkey and returns session access token.
 */
async function authenticateForSensitiveVault(): Promise<string> {
  // Визначаємо користувача для якого виконується підтвердження доступу.
  const username = getUsername();
  // Окремий клієнт для поточного кроку аутентифікації.
  const client = createClient();

  // Даємо користувачу візуальний стан очікування WebAuthn assertion.
  setStatus("Waiting for passkey verification...", "pending");

  // Authentication ceremony: options -> navigator.credentials.get -> verify.
  const result = await client.login({
    username,
    context: {
      source: "sensitive-demo",
      flow: "vault-access",
      userId: getUserId(),
    },
    riskSignals: {
      trustedDevice: true,
    },
  });

  if (!result.verified) {
    throw new Error("Passkey verification failed.");
  }

  // Дістаємо session token, який backend видає після успішної верифікації assertion.
  const sessionToken = result.session?.accessToken;
  if (!sessionToken) {
    throw new Error("Backend did not return access token.");
  }

  return sessionToken;
}

/**
 * Encrypts plain text with random AES key.
 */
async function encryptSensitiveValue(value: string): Promise<SensitiveVaultPayload> {
  ensureCryptoSupport();

  // Кодуємо текст у байти перед симетричним шифруванням.
  const encoder = new TextEncoder();
  // Генеруємо одноразовий AES-GCM ключ для цього payload.
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  // Генеруємо випадковий IV; його треба зберігати разом із шифротекстом.
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Шифруємо значення з прив'язкою до IV.
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(value),
  );
  // Експортуємо ключ у raw-формат для демо-прикладу зворотного розшифрування.
  const rawKey = await crypto.subtle.exportKey("raw", key);

  return {
    encryptedData: arrayBufferToBase64Url(encrypted),
    iv: uint8ArrayToBase64Url(iv),
    keyMaterial: arrayBufferToBase64Url(rawKey),
  };
}

/**
 * Decrypts previously encrypted sensitive value.
 */
async function decryptSensitiveValue(payload: SensitiveVaultPayload): Promise<string> {
  ensureCryptoSupport();

  // Відновлюємо бінарні компоненти з base64url для Web Crypto.
  const iv = new Uint8Array(base64UrlToArrayBuffer(payload.iv));
  const keyBuffer = base64UrlToArrayBuffer(payload.keyMaterial);
  const cipherBuffer = base64UrlToArrayBuffer(payload.encryptedData);

  // Імпортуємо ключ тільки для операції decrypt.
  const key = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  // Розшифровуємо ciphertext тим самим алгоритмом та IV.
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipherBuffer,
  );

  return new TextDecoder().decode(new Uint8Array(decryptedBuffer));
}

/**
 * Posts JSON to dedicated demo endpoint.
 */
async function postDemoJson(path: string, payload: Record<string, unknown>): Promise<unknown> {
  // Нормалізуємо base URL, щоб уникнути подвійних слешів у запиті.
  const baseUrl = getValue("apiUrl").replace(/\/+$/, "");
  // Уніфікований POST для серверних операцій демо vault.
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-demo-client": "passkey-sensitive-demo",
    },
    body: JSON.stringify(payload),
  });

  // Декодуємо тіло відповіді перед обробкою помилок/успіху.
  const responseBody = await parseResponseBody(response);
  if (!response.ok) {
    throw new Error(
      typeof responseBody === "object" && responseBody && "error" in responseBody
        ? String((responseBody as { error: unknown }).error)
        : `Request failed with status ${response.status}`,
    );
  }

  return responseBody;
}

/**
 * Parses HTTP response body if present.
 */
async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Ensures Web Crypto API support.
 */
function ensureCryptoSupport(): void {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API is not available in this browser.");
  }
}

/**
 * Runs action and writes structured logs.
 */
async function runAction(name: string, handler: () => Promise<unknown>): Promise<void> {
  appendLog(`> ${name}: started`);

  try {
    setBusy(true);
    const result = await handler();
    appendLog(`> ${name}: success`);
    appendLog(JSON.stringify(result, null, 2));
  } catch (error) {
    setStatus("Action failed. Check logs.", "error");
    appendLog(`> ${name}: failed`);
    appendLog(formatError(error));
  } finally {
    setBusy(false);
  }
}

/**
 * Appends line to log panel.
 */
function appendLog(message: string): void {
  logs.textContent = `${logs.textContent ?? ""}${message}\n`;
  logs.scrollTop = logs.scrollHeight;
}

/**
 * Sets status label text and tone.
 */
function setStatus(message: string, tone: "ok" | "pending" | "error"): void {
  status.textContent = message;
  status.className = tone === "ok" ? "status-ok" : tone === "pending" ? "status-pending" : "status-error";
}

/**
 * Resets status text and style to initial neutral state.
 */
function resetStatus(): void {
  status.textContent = "Ready";
  status.className = "";
}

/**
 * Enables or disables action buttons.
 */
function setBusy(value: boolean): void {
  isBusy = value;
  syncSensitiveActionButtons();
}

/**
 * Synchronizes enabled/disabled state of action buttons.
 */
function syncSensitiveActionButtons(): void {
  registerSensitiveBtn.disabled = isBusy;

  const shouldDisableSensitiveActions = isBusy || !hasRegisteredPasskey;
  hideSensitiveBtn.disabled = shouldDisableSensitiveActions;
  revealSensitiveBtn.disabled = shouldDisableSensitiveActions;
  clearSensitiveBtn.disabled = shouldDisableSensitiveActions;
}

/**
 * Converts unknown error to readable string.
 */
function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

/**
 * Returns required sensitive input value.
 */
function getSensitiveInput(): string {
  const value = getElement<HTMLTextAreaElement>("sensitiveInput").value.trim();
  if (!value) {
    throw new Error("Sensitive input is required.");
  }

  return value;
}

/**
 * Stores last username in local storage.
 */
function cacheLastUser(username: string): void {
  localStorage.setItem("passkey.demo.sensitive.lastUser", username);
}

/**
 * Stores username that has registered passkey in this demo.
 */
function cacheRegisteredPasskeyUser(username: string): void {
  localStorage.setItem("passkey.demo.sensitive.registeredUser", username.trim());
}

/**
 * Returns username with registered passkey from local storage.
 */
function getRegisteredPasskeyUser(): string | null {
  const value = localStorage.getItem("passkey.demo.sensitive.registeredUser");
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Restores last username from local storage.
 */
function restoreLastUser(): void {
  const cachedUser = localStorage.getItem("passkey.demo.sensitive.lastUser");
  if (!cachedUser) {
    return;
  }

  getElement<HTMLInputElement>("username").value = cachedUser;
}

/**
 * Gets user id value.
 */
function getUserId(): string {
  const value = getValue("userId").trim();
  if (!value) {
    throw new Error("User ID is required.");
  }

  return value;
}

/**
 * Gets username value.
 */
function getUsername(): string {
  const value = getValue("username").trim();
  if (!value) {
    throw new Error("Username is required.");
  }

  return value;
}

/**
 * Gets username without throwing to drive UI state updates.
 */
function getUsernameSafe(): string {
  return getValue("username").trim();
}

/**
 * Gets display name value.
 */
function getDisplayName(): string {
  const value = getValue("displayName").trim();
  if (!value) {
    throw new Error("Display name is required.");
  }

  return value;
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
