import {
  createFetchBackendAdapter,
  createPasskeyClient,
  WebAuthnService,
  uint8ArrayToBase64Url,
  type CredentialAssertionJSON,
  type CredentialAttestationJSON,
} from "../src/index";

const logs = getElement<HTMLPreElement>("logs");
const mockWebAuthnToggle = getElement<HTMLInputElement>("mockWebAuthn");

getElement<HTMLButtonElement>("registerBtn").addEventListener("click", () => {
  void runFlow("register", async () => {
    const client = createClient();
    const result = await client.register({
      user: {
        id: getValue("userId"),
        username: getValue("username"),
        displayName: getValue("displayName"),
      },
      context: {
        source: "demo-ui",
      },
      riskSignals: {
        trustedDevice: true,
      },
    });

    return result;
  });
});

getElement<HTMLButtonElement>("loginBtn").addEventListener("click", () => {
  void runFlow("login", async () => {
    const client = createClient();
    const result = await client.login({
      username: getValue("username"),
      context: {
        source: "demo-ui",
      },
    });

    return result;
  });
});

getElement<HTMLButtonElement>("sensitiveBtn").addEventListener("click", () => {
  void runFlow("sensitive-action", async () => {
    const client = createClient();
    const result = await client.confirmSensitiveAction({
      userId: getValue("userId"),
      context: {
        source: "demo-ui",
        action: "change-payout-account",
      },
    });

    return result;
  });
});

getElement<HTMLButtonElement>("paymentBtn").addEventListener("click", () => {
  void runFlow("payment-step-up", async () => {
    const client = createClient();
    const result = await client.confirmCardPayment({
      payment: {
        paymentIntentId: getValue("paymentIntentId"),
        amountMinor: Number(getValue("amountMinor")),
        currency: getValue("currency"),
        merchantId: getValue("merchantId"),
      },
      userId: getValue("userId"),
      context: {
        source: "demo-ui",
      },
      riskSignals: {
        trustedDevice: true,
      },
    });

    return result;
  });
});

appendLog("Demo ready. Start mock API: npm run server:mock");
appendLog("For real device WebAuthn use: npm run server:device");
appendLog("Then run UI: npm run dev");
appendLog("Password-to-passkey demo: http://localhost:5173/login.html");
appendLog("Sensitive data vault demo: http://localhost:5173/sensitive.html");
appendLog("Card payment demo: http://localhost:5173/card-pay.html");

/**
 * Creates passkey client with runtime-selected WebAuthn transport.
 */
function createClient() {
  const adapter = createFetchBackendAdapter({
    baseUrl: getValue("apiUrl"),
    defaultHeaders: {
      "x-demo-client": "passkey-sdk-demo",
    },
  });

  const webAuthnService = mockWebAuthnToggle.checked
    ? new DemoMockWebAuthnService()
    : undefined;

  return createPasskeyClient({
    adapter,
    ...(webAuthnService ? { webAuthnService } : {}),
  });
}

/**
 * Executes flow and prints structured logs.
 */
async function runFlow(flowName: string, handler: () => Promise<unknown>): Promise<void> {
  appendLog(`> ${flowName}: started`);

  try {
    const result = await handler();
    appendLog(`> ${flowName}: success`);
    appendLog(JSON.stringify(result, null, 2));
  } catch (error) {
    appendLog(`> ${flowName}: failed`);
    appendLog(formatError(error));
  }
}

/**
 * Adds line to log panel.
 */
function appendLog(message: string): void {
  logs.textContent = `${logs.textContent ?? ""}${message}\n`;
  logs.scrollTop = logs.scrollHeight;
}

/**
 * Formats unknown error into readable text.
 */
function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

/**
 * Returns input value by element id.
 */
function getValue(id: string): string {
  return getElement<HTMLInputElement>(id).value;
}

/**
 * Resolves a required DOM element.
 */
function getElement<TElement extends Element>(id: string): TElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Required element #${id} was not found.`);
  }

  return element as unknown as TElement;
}

/**
 * Mock WebAuthn service for local demo without authenticator hardware.
 */
class DemoMockWebAuthnService extends WebAuthnService {
  public override isSupported(): boolean {
    return true;
  }

  public override async createCredential(): Promise<CredentialAttestationJSON> {
    const id = `mock-reg-${Date.now()}`;

    return {
      id,
      rawId: encode(`raw:${id}`),
      type: "public-key",
      response: {
        clientDataJSON: encode("client-data-json"),
        attestationObject: encode("attestation-object"),
        transports: ["internal"],
      },
      clientExtensionResults: {},
    };
  }

  public override async getAssertion(): Promise<CredentialAssertionJSON> {
    const id = `mock-assert-${Date.now()}`;

    return {
      id,
      rawId: encode(`raw:${id}`),
      type: "public-key",
      response: {
        clientDataJSON: encode("client-data-json"),
        authenticatorData: encode("authenticator-data"),
        signature: encode("signature"),
        userHandle: encode(getValue("userId")),
      },
      clientExtensionResults: {},
    };
  }
}

/**
 * Encodes plain text into base64url.
 */
function encode(value: string): string {
  return uint8ArrayToBase64Url(new TextEncoder().encode(value));
}
