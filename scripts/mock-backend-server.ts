import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import process from "node:process";

const PORT = Number(process.env["PASSKEY_MOCK_PORT"] ?? 4000);
const RP_ID = "localhost";
const RP_NAME = "Passkey Demo RP";

interface ChallengeRecord {
  kind: "registration" | "authentication" | "payment";
  createdAt: number;
}

const challengeStore = new Map<string, ChallengeRecord>();

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

  if (path === "/passkeys/registration/options") {
    const challengeId = randomUUID();
    challengeStore.set(challengeId, {
      kind: "registration",
      createdAt: Date.now(),
    });

    const user = getUserFromPayload(body);

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
        residentKey: "preferred",
        userVerification: "preferred",
      },
      attestation: "none",
    });
    return;
  }

  if (path === "/passkeys/registration/verify") {
    const challengeId = typeof body?.["challengeId"] === "string" ? body["challengeId"] : "";
    const credential = body?.["credential"] as Record<string, unknown> | undefined;
    const credentialId =
      typeof credential?.["id"] === "string" ? credential["id"] : randomUUID();
    const userId = typeof body?.["userId"] === "string" ? body["userId"] : "demo-user";

    verifyChallenge(response, challengeId, "registration");
    if (!response.writableEnded) {
      sendJson(response, 200, {
        verified: true,
        credentialId,
        session: {
          userId,
          sessionId: randomUUID(),
          accessToken: "demo-access-token",
          refreshToken: "demo-refresh-token",
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          amr: ["passkey"],
        },
      });
    }
    return;
  }

  if (path === "/passkeys/authentication/options") {
    const challengeId = randomUUID();
    challengeStore.set(challengeId, {
      kind: "authentication",
      createdAt: Date.now(),
    });

    sendJson(response, 200, {
      challenge: randomChallenge(),
      challengeId,
      rpId: RP_ID,
      timeout: 60000,
      userVerification: "preferred",
    });
    return;
  }

  if (path === "/passkeys/authentication/verify") {
    const challengeId = typeof body?.["challengeId"] === "string" ? body["challengeId"] : "";
    const context = body?.["context"] as Record<string, unknown> | undefined;
    const userId = typeof context?.["userId"] === "string" ? context["userId"] : "demo-user";

    verifyChallenge(response, challengeId, "authentication");
    if (!response.writableEnded) {
      sendJson(response, 200, {
        verified: true,
        levelOfAssurance: "high",
        session: {
          userId,
          sessionId: randomUUID(),
          accessToken: "demo-access-token",
          refreshToken: "demo-refresh-token",
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          amr: ["passkey"],
        },
      });
    }
    return;
  }

  if (path === "/passkeys/payments/options") {
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
    return;
  }

  if (path === "/passkeys/payments/verify") {
    const challengeId = typeof body?.["challengeId"] === "string" ? body["challengeId"] : "";
    verifyChallenge(response, challengeId, "payment");
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
          : "Payment approved with passkey step-up.",
      });
    }
    return;
  }

  sendJson(response, 404, {
    error: "Not found",
    path,
  });
});

server.listen(PORT, () => {
  console.log(`[mock-api] Passkey mock backend is running on http://localhost:${PORT}`);
  console.log("[mock-api] Endpoints:");
  console.log("  POST /passkeys/registration/options");
  console.log("  POST /passkeys/registration/verify");
  console.log("  POST /passkeys/authentication/options");
  console.log("  POST /passkeys/authentication/verify");
  console.log("  POST /passkeys/payments/options");
  console.log("  POST /passkeys/payments/verify");
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
 * Verifies challenge type and presence.
 */
function verifyChallenge(
  response: ServerResponse,
  challengeId: string,
  expectedKind: ChallengeRecord["kind"],
): void {
  if (!challengeId) {
    sendJson(response, 400, { error: "challengeId is required" });
    return;
  }

  const record = challengeStore.get(challengeId);
  if (!record || record.kind !== expectedKind) {
    sendJson(response, 400, { error: "challengeId is invalid or expired", challengeId });
    return;
  }

  challengeStore.delete(challengeId);
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
