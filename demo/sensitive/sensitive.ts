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
    const client = createClient();
    const username = getUsername();

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

    cacheLastUser(username);
    cacheRegisteredPasskeyUser(username);
    hasRegisteredPasskey = true;
    syncSensitiveActionButtons();
    setStatus("Passkey registered for sensitive vault.", "ok");
    return result;
  });
});

hideSensitiveBtn.addEventListener("click", () => {
  void runAction("hide-sensitive-data", async () => {
    const plainSecret = getSensitiveInput();
    const sessionToken = await authenticateForSensitiveVault();
    const encryptedPayload = await encryptSensitiveValue(plainSecret);

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
    const sessionToken = await authenticateForSensitiveVault();

    const payload = await postDemoJson("/demo/sensitive/reveal", {
      sessionToken,
      username: getUsername(),
    }) as SensitiveVaultPayload;

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
    const sessionToken = await authenticateForSensitiveVault();

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
  const adapter = createFetchBackendAdapter({
    baseUrl: getValue("apiUrl"),
    defaultHeaders: {
      "x-demo-client": "passkey-sensitive-demo",
    },
  });

  return createPasskeyClient({ adapter });
}

/**
 * Authenticates user with passkey and returns session access token.
 */
async function authenticateForSensitiveVault(): Promise<string> {
  const username = getUsername();
  const client = createClient();

  setStatus("Waiting for passkey verification...", "pending");

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

  const encoder = new TextEncoder();
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(value),
  );
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

  const iv = new Uint8Array(base64UrlToArrayBuffer(payload.iv));
  const keyBuffer = base64UrlToArrayBuffer(payload.keyMaterial);
  const cipherBuffer = base64UrlToArrayBuffer(payload.encryptedData);

  const key = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
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
  const baseUrl = getValue("apiUrl").replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-demo-client": "passkey-sensitive-demo",
    },
    body: JSON.stringify(payload),
  });

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
