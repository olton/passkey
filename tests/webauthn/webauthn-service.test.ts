import { afterEach, describe, expect, it, vi } from "vitest";
import { WebAuthnService } from "../../src/webauthn";
import { PasskeyNotSupportedError, UserCancelledError } from "../../src/errors";
import { uint8ArrayToBase64Url } from "../../src/utils";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "../../src/types";

class FakePublicKeyCredential {
  public id: string;
  public rawId: ArrayBuffer;
  public type: PublicKeyCredentialType;
  public response: unknown;

  constructor(init: {
    id: string;
    rawId: ArrayBuffer;
    type?: PublicKeyCredentialType;
    response: unknown;
  }) {
    this.id = init.id;
    this.rawId = init.rawId;
    this.type = init.type ?? "public-key";
    this.response = init.response;
  }

  public getClientExtensionResults(): AuthenticationExtensionsClientOutputs {
    return {};
  }
}

const registrationOptions: PublicKeyCredentialCreationOptionsJSON = {
  challenge: encodeBytes([1, 2, 3, 4]),
  challengeId: "ch-reg",
  rp: {
    id: "localhost",
    name: "Demo",
  },
  user: {
    id: encodeBytes([9, 8, 7, 6]),
    name: "demo@example.com",
    displayName: "Demo User",
  },
  pubKeyCredParams: [{ type: "public-key", alg: -7 }],
  excludeCredentials: [
    {
      id: encodeBytes([5, 4, 3, 2]),
      type: "public-key",
    },
  ],
};

const requestOptions: PublicKeyCredentialRequestOptionsJSON = {
  challenge: encodeBytes([7, 7, 7, 7]),
  challengeId: "ch-auth",
  rpId: "localhost",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("WebAuthnService", () => {
  it("throws PasskeyNotSupportedError when runtime does not support WebAuthn", async () => {
    vi.stubGlobal("PublicKeyCredential", undefined);
    Object.defineProperty(globalThis.navigator, "credentials", {
      configurable: true,
      value: undefined,
    });

    const service = new WebAuthnService();

    await expect(service.createCredential(registrationOptions)).rejects.toBeInstanceOf(
      PasskeyNotSupportedError,
    );
  });

  it("serializes attestation response from createCredential", async () => {
    vi.stubGlobal(
      "PublicKeyCredential",
      FakePublicKeyCredential as unknown as typeof PublicKeyCredential,
    );

    const createMock = vi.fn().mockResolvedValue(
      new FakePublicKeyCredential({
        id: "credential-1",
        rawId: bytesBuffer([1, 1, 1]),
        response: {
          clientDataJSON: bytesBuffer([1, 2, 3]),
          attestationObject: bytesBuffer([4, 5, 6]),
          getTransports: () => ["internal"],
        },
      }),
    );

    Object.defineProperty(globalThis.navigator, "credentials", {
      configurable: true,
      value: {
        create: createMock,
        get: vi.fn(),
      },
    });

    const service = new WebAuthnService();
    const result = await service.createCredential(registrationOptions);
    const firstCall = createMock.mock.calls[0];

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(firstCall).toBeDefined();
    expect(firstCall?.[0]?.publicKey?.challenge instanceof ArrayBuffer).toBe(true);
    expect(result.id).toBe("credential-1");
    expect(result.type).toBe("public-key");
    expect(result.response.transports).toEqual(["internal"]);
  });

  it("maps NotAllowedError to UserCancelledError during assertion", async () => {
    vi.stubGlobal(
      "PublicKeyCredential",
      FakePublicKeyCredential as unknown as typeof PublicKeyCredential,
    );

    Object.defineProperty(globalThis.navigator, "credentials", {
      configurable: true,
      value: {
        create: vi.fn(),
        get: vi.fn().mockRejectedValue(new DOMException("cancelled", "NotAllowedError")),
      },
    });

    const service = new WebAuthnService();

    await expect(service.getAssertion(requestOptions)).rejects.toBeInstanceOf(
      UserCancelledError,
    );
  });

  it("serializes assertion response from getAssertion", async () => {
    vi.stubGlobal(
      "PublicKeyCredential",
      FakePublicKeyCredential as unknown as typeof PublicKeyCredential,
    );

    Object.defineProperty(globalThis.navigator, "credentials", {
      configurable: true,
      value: {
        create: vi.fn(),
        get: vi.fn().mockResolvedValue(
          new FakePublicKeyCredential({
            id: "assertion-1",
            rawId: bytesBuffer([2, 2, 2]),
            response: {
              clientDataJSON: bytesBuffer([10, 11]),
              authenticatorData: bytesBuffer([12, 13]),
              signature: bytesBuffer([14, 15]),
              userHandle: bytesBuffer([16, 17]),
            },
          }),
        ),
      },
    });

    const service = new WebAuthnService();
    const result = await service.getAssertion(requestOptions);

    expect(result.id).toBe("assertion-1");
    expect(result.response.userHandle).toBeDefined();
    expect(result.type).toBe("public-key");
  });
});

function bytesBuffer(source: number[]): ArrayBuffer {
  return new Uint8Array(source).buffer;
}

function encodeBytes(source: number[]): string {
  return uint8ArrayToBase64Url(new Uint8Array(source));
}
