import {
  createFetchBackendAdapter,
  createPasskeyClient,
} from "../src/index";

const logs = getElement<HTMLPreElement>("logs");
const status = getElement<HTMLParagraphElement>("status");
const resultModal = getElement<HTMLDivElement>("resultModal");
const resultModalTitle = getElement<HTMLHeadingElement>("resultModalTitle");
const resultModalText = getElement<HTMLParagraphElement>("resultModalText");
const closeResultModalBtn = getElement<HTMLButtonElement>("closeResultModalBtn");

const savePasskeyBtn = getElement<HTMLButtonElement>("savePasskeyBtn");
const passkeyLoginBtn = getElement<HTMLButtonElement>("passkeyLoginBtn");
const clearLogsBtn = getElement<HTMLButtonElement>("clearLogsBtn");

closeResultModalBtn.addEventListener("click", closeResultModal);
resultModal.addEventListener("click", (event) => {
  if (event.target === resultModal) {
    closeResultModal();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !resultModal.classList.contains("hidden")) {
    closeResultModal();
  }
});

savePasskeyBtn.addEventListener("click", () => {
  void runAction("password-login-and-register-passkey", async () => {
    const username = getUsername();
    const password = getPassword();
    const userId = deriveUserId(username);

    await simulatePasswordLogin(username, password);

    const client = createClient();
    const result = await client.register({
      user: {
        id: userId,
        username,
        displayName: getDisplayName(),
      },
      context: {
        source: "login-demo",
        flow: "password-to-passkey",
      },
      riskSignals: {
        trustedDevice: true,
      },
    });

    cacheLastUser(username);
    clearPassword();
    setStatus("Passkey saved on this device (authenticator).", "ok");

    return result;
  });
});

passkeyLoginBtn.addEventListener("click", () => {
  void runAction("passkey-login", async () => {
    const username = getUsername();
    const client = createClient();

    const result = await client.login({
      username,
      context: {
        source: "login-demo",
        flow: "passkey-login",
      },
      riskSignals: {
        trustedDevice: true,
      },
    });

    setStatus("Passkey login completed.", "ok");
    return result;
  }, { showResultModal: true });
});

clearLogsBtn.addEventListener("click", () => {
  logs.textContent = "";
  appendLog("Logs cleared.");
});

restoreLastUser();
appendLog("Login demo ready.");
appendLog("Use real backend: npm run server:device");
appendLog("Open this page: http://localhost:5173/login.html");

/**
 * Creates passkey client for this demo page.
 */
function createClient() {
  const adapter = createFetchBackendAdapter({
    baseUrl: getValue("apiUrl"),
    defaultHeaders: {
      "x-demo-client": "passkey-login-demo",
    },
  });

  return createPasskeyClient({ adapter });
}

/**
 * Simulates password login step before passkey enrollment.
 */
async function simulatePasswordLogin(username: string, password: string): Promise<void> {
  setStatus("Checking password...", "pending");

  if (!username.includes("@")) {
    throw new Error("Username must be a valid email.");
  }

  if (password.length < 8) {
    throw new Error("Password must contain at least 8 characters.");
  }

  // Demo-only behavior: emulate successful password step locally.
  await Promise.resolve();
  appendLog("Password login step passed (demo simulation).");
}

/**
 * Runs named demo action and reports outcome to log panel.
 */
async function runAction(
  name: string,
  handler: () => Promise<unknown>,
  options?: { showResultModal?: boolean },
): Promise<void> {
  appendLog(`> ${name}: started`);
  const shouldShowResultModal = options?.showResultModal === true;

  try {
    toggleBusy(true);
    const result = await handler();
    appendLog(`> ${name}: success`);
    appendLog(JSON.stringify(result, null, 2));
    if (shouldShowResultModal) {
      showResultModal(true, name);
    }
  } catch (error) {
    setStatus("Action failed. Check logs.", "error");
    appendLog(`> ${name}: failed`);
    appendLog(formatError(error));
    if (shouldShowResultModal) {
      showResultModal(false, name);
    }
  } finally {
    toggleBusy(false);
  }
}

/**
 * Shows modal with explicit login result.
 */
function showResultModal(isSuccess: boolean, actionName: string): void {
  resultModalTitle.textContent = isSuccess ? "ОК" : "Відмова, невірні дані";
  resultModalTitle.className = isSuccess ? "modal-ok" : "modal-error";
  resultModalText.textContent = isSuccess
    ? `Дію "${actionName}" виконано успішно.`
    : "Логін не виконано. Перевірте введені дані та спробуйте ще раз.";

  resultModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

/**
 * Closes result modal.
 */
function closeResultModal(): void {
  resultModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

/**
 * Appends message to log panel.
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
 * Enables or disables buttons while action is in progress.
 */
function toggleBusy(isBusy: boolean): void {
  savePasskeyBtn.disabled = isBusy;
  passkeyLoginBtn.disabled = isBusy;
}

/**
 * Converts unknown errors into readable text.
 */
function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

/**
 * Derives deterministic user id from username for demo storage.
 */
function deriveUserId(username: string): string {
  return `usr_${username.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
}

/**
 * Saves last used username in local storage.
 */
function cacheLastUser(username: string): void {
  localStorage.setItem("passkey.demo.login.lastUser", username);
}

/**
 * Restores last used username if present.
 */
function restoreLastUser(): void {
  const cachedUser = localStorage.getItem("passkey.demo.login.lastUser");
  if (!cachedUser) {
    return;
  }

  getElement<HTMLInputElement>("username").value = cachedUser;
}

/**
 * Returns trimmed username from UI.
 */
function getUsername(): string {
  const value = getValue("username").trim();
  if (!value) {
    throw new Error("Username is required.");
  }

  return value;
}

/**
 * Returns password from UI.
 */
function getPassword(): string {
  const value = getValue("password");
  if (!value) {
    throw new Error("Password is required.");
  }

  return value;
}

/**
 * Returns display name, falling back to username prefix.
 */
function getDisplayName(): string {
  const displayName = getValue("displayName").trim();
  if (displayName) {
    return displayName;
  }

  return getUsername().split("@")[0] ?? "User";
}

/**
 * Clears password field after successful enrollment.
 */
function clearPassword(): void {
  getElement<HTMLInputElement>("password").value = "";
}

/**
 * Returns input value by element id.
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
