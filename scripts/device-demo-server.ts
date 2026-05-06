import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import process from "node:process";
import { termx } from "@olton/terminal";
import { DEFAULT_PASSKEY_BACKEND_ENDPOINTS } from "../src";

const PORT = Number(process.env["PASSKEY_WEBAUTHN_PORT"] ?? 4100);
const RP_ID = process.env["PASSKEY_WEBAUTHN_RP_ID"] ?? "localhost";
const RP_NAME = process.env["PASSKEY_WEBAUTHN_RP_NAME"] ?? "Passkey WebAuthn Demo RP";
const CHALLENGE_TTL_MS = Number(process.env["PASSKEY_WEBAUTHN_CHALLENGE_TTL_MS"] ?? 120000);
const SESSION_TTL_MS = Number(process.env["PASSKEY_WEBAUTHN_SESSION_TTL_MS"] ?? 3600000);

interface ChallengeRecord {
  kind: "registration" | "authentication" | "payment";
  createdAt: number;
  userId?: string;
  username?: string;
}

interface AuthSessionRecord {
  userId: string;
  username: string;
  expiresAt: number;
}

interface SensitiveVaultRecord {
  encryptedData: string;
  iv: string;
  keyMaterial: string;
  updatedAt: number;
}

const ROUTES = {
  ...DEFAULT_PASSKEY_BACKEND_ENDPOINTS,
  // registrationOptions: "/passkeys/registration/options",
  // registrationVerify: "/passkeys/registration/verify",
  // authenticationOptions: "/passkeys/authentication/options",
  // authenticationVerify: "/passkeys/authentication/verify",
  // paymentOptions: "/passkeys/payments/options",
  // paymentVerify: "/passkeys/payments/verify",
  sensitiveStore: "/demo/sensitive/store",
  sensitiveReveal: "/demo/sensitive/reveal",
  sensitiveClear: "/demo/sensitive/clear",
} as const;

const ROUTES_DESCRIPTIONS = {
  "/passkeys/registration/options": "Provides registration options for platform passkeys (For example: Windows Hello).",
  "/passkeys/registration/verify": "Verifies registration response payload.",
  "/passkeys/authentication/options": "Provides login challenge requiring local user verification.",
  "/passkeys/authentication/verify": "Verifies authentication assertion payload.",
  "/passkeys/payments/options": "Provides payment challenge with required user verification.",
  "/passkeys/payments/verify": "Verifies payment step-up assertion payload.",
} as const;

const challengeStore = new Map<string, ChallengeRecord>();
const authSessionStore = new Map<string, AuthSessionRecord>();
const sensitiveVaultStore = new Map<string, SensitiveVaultRecord>();

const server = createServer(async (request, response) => {
  applyCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, {
      error: "Method not allowed",
      method: request.method,
    });
    return;
  }

  const path = request.url ?? "/";
  const body = await readJsonBody(request);

  if (handleRoute(path, body, response)) {
    return;
  }

  sendJson(response, 404, {
    error: "Not found",
    path,
  });
});

server.listen(PORT, () => {
  console.log("Device demo backend server for real browser ceremony.");
  console.log("Copyright (c) 2026 by Serhii Pimenov. All rights reserved.");
  console.log("This server is intended for local development and testing purposes only.");
  console.log("----------------------------------------------------------");
  console.log(`To run client demo use ${termx.bold.yellow.write("npm run demo")} command.`);
  console.log("----------------------------------------------------------");
  console.log(`[device-demo] Starting server on http://localhost:${PORT}`);
  console.log(`[device-demo] RP ID: ${RP_ID}`);
  console.log(`[device-demo] Challenge TTL: ${CHALLENGE_TTL_MS}ms`);
  console.log("[device-demo] Endpoints:");

  for (const [path, description] of Object.entries(ROUTES_DESCRIPTIONS)) {
    console.log(`  ${termx.bold.cyanBright.write(path)} - ${termx.gray.write(description)}`);
  }

  console.log("[device-demo] Demo required is a platform with WebAuthn support and configured user verification method (Windows Hello, Touch ID, Face ID, etc).");
  console.log("");
});

/**
 * Reads and parses request JSON body safely.
 */
async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown> | null> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return null;
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Sends JSON payload with proper headers.
 */
function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  if (response.writableEnded) {
    return;
  }

  response.writeHead(statusCode, {
    "content-type": "application/json",
  });
  response.end(JSON.stringify(payload));
}

/**
 * Applies permissive CORS headers for local demo usage.
 */
function applyCorsHeaders(response: ServerResponse): void {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type,x-demo-client");
}

/**
 * Dispatches request to specific route handler.
 */
function handleRoute(
  path: string,
  body: Record<string, unknown> | null,
  response: ServerResponse,
): boolean {
  if (path === ROUTES.beginRegistration) {
    handleRegistrationOptions(body, response);
    return true;
  }

  if (path === ROUTES.finishRegistration) {
    handleRegistrationVerify(body, response);
    return true;
  }

  if (path === ROUTES.beginAuthentication) {
    handleAuthenticationOptions(body, response);
    return true;
  }

  if (path === ROUTES.finishAuthentication) {
    handleAuthenticationVerify(body, response);
    return true;
  }

  if (path === ROUTES.beginPaymentStepUp) {
    handlePaymentOptions(response);
    return true;
  }

  if (path === ROUTES.finishPaymentStepUp) {
    handlePaymentVerify(body, response);
    return true;
  }

  if (path === ROUTES.sensitiveStore) {
    handleSensitiveStore(body, response);
    return true;
  }

  if (path === ROUTES.sensitiveReveal) {
    handleSensitiveReveal(body, response);
    return true;
  }

  if (path === ROUTES.sensitiveClear) {
    handleSensitiveClear(body, response);
    return true;
  }

  return false;
}

/**
 * Handles registration options endpoint.
 */
function handleRegistrationOptions(
  body: Record<string, unknown> | null,
  response: ServerResponse,
): void {
  const challengeId = randomUUID();
  const user = getUserFromPayload(body);

  challengeStore.set(challengeId, {
    kind: "registration",
    createdAt: Date.now(),
    userId: user.id,
    username: user.username,
  });

  sendJson(response, 200, {
    challenge: randomChallenge(),
    challengeId,
    rp: {
      id: RP_ID,
      name: RP_NAME,
    },
    user: {
      id: encodeBase64Url(user.id),
      name: user.username,
      displayName: user.displayName,
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 },
    ],
    timeout: 60000,
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "required",
      userVerification: "required",
    },
    attestation: "none",
  });
}

/**
 * Handles registration verification endpoint.
 */
function handleRegistrationVerify(
  body: Record<string, unknown> | null,
  response: ServerResponse,
): void {
  const challengeId = typeof body?.["challengeId"] === "string" ? body["challengeId"] : "";
  const credential = body?.["credential"] as Record<string, unknown> | undefined;
  const credentialId =
    typeof credential?.["id"] === "string" ? credential["id"] : randomUUID();
  const challenge = verifyChallenge(response, challengeId, "registration");
  if (!challenge || response.writableEnded) {
    return;
  }

  const userId =
    typeof body?.["userId"] === "string"
      ? body["userId"]
      : challenge.userId ?? "demo-user";
  const username = challenge.username ?? `${userId}@demo.local`;
  const session = createSession(userId, username);

  if (!response.writableEnded) {
    sendJson(response, 200, {
      verified: true,
      credentialId,
      session,
      message: "Registration verified in WebAuthn demo backend.",
    });
  }
}

/**
 * Handles authentication options endpoint.
 */
function handleAuthenticationOptions(
  body: Record<string, unknown> | null,
  response: ServerResponse,
): void {
  const challengeId = randomUUID();
  const identity = getAuthIdentityFromPayload(body);

  const challengeRecord: ChallengeRecord = {
    kind: "authentication",
    createdAt: Date.now(),
    ...(identity.userId ? { userId: identity.userId } : {}),
    ...(identity.username ? { username: identity.username } : {}),
  };

  challengeStore.set(challengeId, challengeRecord);

  sendJson(response, 200, {
    challenge: randomChallenge(),
    challengeId,
    rpId: RP_ID,
    timeout: 60000,
    userVerification: "required",
  });
}

/**
 * Handles authentication verification endpoint.
 */
function handleAuthenticationVerify(
  body: Record<string, unknown> | null,
  response: ServerResponse,
): void {
  const challengeId = typeof body?.["challengeId"] === "string" ? body["challengeId"] : "";
  const challenge = verifyChallenge(response, challengeId, "authentication");
  if (!challenge || response.writableEnded) {
    return;
  }

  const username = challenge.username ?? "demo@example.com";
  const userId = challenge.userId ?? deriveUserIdFromUsername(username);
  const session = createSession(userId, username);

  if (!response.writableEnded) {
    sendJson(response, 200, {
      verified: true,
      levelOfAssurance: "high",
      session,
      message: "Authentication verified in WebAuthn demo backend.",
    });
  }
}

/**
 * Handles payment options endpoint.
 */
function handlePaymentOptions(response: ServerResponse): void {
  const challengeId = randomUUID();
  challengeStore.set(challengeId, {
    kind: "payment",
    createdAt: Date.now(),
  });

  sendJson(response, 200, {
    challenge: randomChallenge(),
    challengeId,
    rpId: RP_ID,
    timeout: 60000,
    userVerification: "required",
  });
}

/**
 * Handles payment verification endpoint.
 */
function handlePaymentVerify(
  body: Record<string, unknown> | null,
  response: ServerResponse,
): void {
  const challengeId = typeof body?.["challengeId"] === "string" ? body["challengeId"] : "";
  if (!verifyChallenge(response, challengeId, "payment") || response.writableEnded) {
    return;
  }

  if (!response.writableEnded) {
    const payment = body?.["payment"] as Record<string, unknown> | undefined;
    const amountMinor = Number(payment?.["amountMinor"] ?? 0);
    const shouldFallback = Number.isFinite(amountMinor) && amountMinor > 100000;

    sendJson(response, 200, {
      decision: shouldFallback ? "fallback_to_3ds" : "approved",
      challengeId,
      eci: shouldFallback ? "07" : "05",
      authValue: shouldFallback ? undefined : "demo-auth-value",
      message: shouldFallback
        ? "Amount threshold exceeded, fallback to 3DS."
        : "Payment approved with WebAuthn passkey step-up.",
    });
  }
}

/**
 * Stores encrypted sensitive payload behind passkey-authenticated session.
 */
function handleSensitiveStore(
  body: Record<string, unknown> | null,
  response: ServerResponse,
): void {
  const sessionToken = asString(body?.["sessionToken"]);
  const username = asString(body?.["username"]);
  const encryptedData = asString(body?.["encryptedData"]);
  const iv = asString(body?.["iv"]);
  const keyMaterial = asString(body?.["keyMaterial"]);

  if (!sessionToken || !username || !encryptedData || !iv || !keyMaterial) {
    sendJson(response, 400, { error: "sessionToken, username, encryptedData, iv and keyMaterial are required" });
    return;
  }

  const session = resolveSession(sessionToken, username);
  if (!session) {
    sendJson(response, 401, { error: "Unauthorized session" });
    return;
  }

  sensitiveVaultStore.set(username, {
    encryptedData,
    iv,
    keyMaterial,
    updatedAt: Date.now(),
  });

  sendJson(response, 200, {
    ok: true,
    message: "Sensitive payload stored.",
    username,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Returns encrypted sensitive payload after passkey-authenticated login.
 */
function handleSensitiveReveal(
  body: Record<string, unknown> | null,
  response: ServerResponse,
): void {
  const sessionToken = asString(body?.["sessionToken"]);
  const username = asString(body?.["username"]);

  if (!sessionToken || !username) {
    sendJson(response, 400, { error: "sessionToken and username are required" });
    return;
  }

  const session = resolveSession(sessionToken, username);
  if (!session) {
    sendJson(response, 401, { error: "Unauthorized session" });
    return;
  }

  const vault = sensitiveVaultStore.get(username);
  if (!vault) {
    sendJson(response, 404, { error: "No sensitive payload stored for this user" });
    return;
  }

  sendJson(response, 200, {
    username,
    encryptedData: vault.encryptedData,
    iv: vault.iv,
    keyMaterial: vault.keyMaterial,
    updatedAt: new Date(vault.updatedAt).toISOString(),
  });
}

/**
 * Clears encrypted sensitive payload for the authenticated user.
 */
function handleSensitiveClear(
  body: Record<string, unknown> | null,
  response: ServerResponse,
): void {
  const sessionToken = asString(body?.["sessionToken"]);
  const username = asString(body?.["username"]);

  if (!sessionToken || !username) {
    sendJson(response, 400, { error: "sessionToken and username are required" });
    return;
  }

  const session = resolveSession(sessionToken, username);
  if (!session) {
    sendJson(response, 401, { error: "Unauthorized session" });
    return;
  }

  sensitiveVaultStore.delete(username);
  sendJson(response, 200, {
    ok: true,
    message: "Sensitive payload cleared.",
    username,
  });
}

/**
 * Verifies challenge type, presence and expiration.
 */
function verifyChallenge(
  response: ServerResponse,
  challengeId: string,
  expectedKind: ChallengeRecord["kind"],
): ChallengeRecord | null {
  if (!challengeId) {
    sendJson(response, 400, { error: "challengeId is required" });
    return null;
  }

  const record = challengeStore.get(challengeId);
  if (!record || record.kind !== expectedKind) {
    sendJson(response, 400, { error: "challengeId is invalid or expired", challengeId });
    return null;
  }

  const challengeAgeMs = Date.now() - record.createdAt;
  if (challengeAgeMs > CHALLENGE_TTL_MS) {
    challengeStore.delete(challengeId);
    sendJson(response, 400, { error: "challengeId is expired", challengeId, challengeAgeMs });
    return null;
  }

  challengeStore.delete(challengeId);
  return record;
}

/**
 * Creates passkey-authenticated session and stores token for later checks.
 */
function createSession(userId: string, username: string): {
  userId: string;
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  amr: string[];
} {
  const sessionId = randomUUID();
  const accessToken = randomUUID();
  const expiresAt = Date.now() + SESSION_TTL_MS;

  authSessionStore.set(accessToken, {
    userId,
    username,
    expiresAt,
  });

  return {
    userId,
    sessionId,
    accessToken,
    refreshToken: randomUUID(),
    expiresAt: new Date(expiresAt).toISOString(),
    amr: ["passkey", "user-verification"],
  };
}

/**
 * Resolves and validates session token and username binding.
 */
function resolveSession(sessionToken: string, expectedUsername: string): AuthSessionRecord | null {
  const session = authSessionStore.get(sessionToken);
  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    authSessionStore.delete(sessionToken);
    return null;
  }

  if (session.username !== expectedUsername) {
    return null;
  }

  return session;
}

/**
 * Extracts auth identity from begin-authentication payload.
 */
function getAuthIdentityFromPayload(payload: Record<string, unknown> | null): {
  userId?: string;
  username?: string;
} {
  const userId = asString(payload?.["userId"]);
  const username = asString(payload?.["username"]);

  return {
    ...(userId ? { userId } : {}),
    ...(username ? { username } : {}),
  };
}

/**
 * Derives stable demo user id from username when user id is missing.
 */
function deriveUserIdFromUsername(username: string): string {
  return `usr_${username.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
}

/**
 * Safely casts unknown value to non-empty string.
 */
function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Extracts user object from registration payload.
 */
function getUserFromPayload(payload: Record<string, unknown> | null): {
  id: string;
  username: string;
  displayName: string;
} {
  const user = (payload?.["user"] ?? {}) as Record<string, unknown>;

  return {
    id: String(user["id"] ?? "demo-user"),
    username: String(user["username"] ?? "demo@example.com"),
    displayName: String(user["displayName"] ?? "Demo User"),
  };
}

/**
 * Generates random base64url challenge.
 */
function randomChallenge(): string {
  return encodeBase64Url(randomUUID().replace(/-/g, ""));
}

/**
 * Encodes plain text as base64url.
 */
function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
