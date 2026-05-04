import { describe, expect, it, vi } from "vitest";
import { PasskeyAuthService } from "../../src/auth";
import type { PasskeyBackendAdapter } from "../../src/adapters";
import type {
  CredentialAssertionJSON,
  CredentialAttestationJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "../../src/types";

const registrationOptions: PublicKeyCredentialCreationOptionsJSON = {
  challenge: "abc",
  challengeId: "challenge-reg-1",
  rp: { id: "localhost", name: "Demo" },
  user: {
    id: "dXNlcjE",
    name: "demo@example.com",
    displayName: "Demo User",
  },
  pubKeyCredParams: [{ type: "public-key", alg: -7 }],
};

const authenticationOptions: PublicKeyCredentialRequestOptionsJSON = {
  challenge: "xyz",
  challengeId: "challenge-auth-1",
  rpId: "localhost",
};

const attestation: CredentialAttestationJSON = {
  id: "cred-1",
  rawId: "raw-1",
  type: "public-key",
  response: {
    clientDataJSON: "client-data",
    attestationObject: "attestation",
    transports: ["internal"],
  },
  clientExtensionResults: {},
};

const assertion: CredentialAssertionJSON = {
  id: "cred-1",
  rawId: "raw-1",
  type: "public-key",
  response: {
    clientDataJSON: "client-data",
    authenticatorData: "auth-data",
    signature: "signature",
  },
  clientExtensionResults: {},
};

describe("auth service", () => {
  it("runs registration flow through adapter and webauthn", async () => {
    const adapter: PasskeyBackendAdapter = {
      beginRegistration: vi.fn().mockResolvedValue(registrationOptions),
      finishRegistration: vi.fn().mockResolvedValue({ verified: true, credentialId: "cred-1" }),
      beginAuthentication: vi.fn(),
      finishAuthentication: vi.fn(),
      beginPaymentStepUp: vi.fn(),
      finishPaymentStepUp: vi.fn(),
    };

    const webAuthn = {
      createCredential: vi.fn().mockResolvedValue(attestation),
      getAssertion: vi.fn(),
    };

    const service = new PasskeyAuthService(
      adapter,
      webAuthn as unknown as never,
    );

    const result = await service.register({
      user: {
        id: "user-1",
        username: "demo@example.com",
        displayName: "Demo User",
      },
      context: {
        source: "test",
      },
    });

    expect(adapter.beginRegistration).toHaveBeenCalledTimes(1);
    expect(webAuthn.createCredential).toHaveBeenCalledWith(registrationOptions);
    expect(adapter.finishRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        challengeId: "challenge-reg-1",
        credential: attestation,
      }),
    );
    expect(result.verified).toBe(true);
  });

  it("sets purpose during login and sensitive action flows", async () => {
    const adapter: PasskeyBackendAdapter = {
      beginRegistration: vi.fn(),
      finishRegistration: vi.fn(),
      beginAuthentication: vi.fn().mockResolvedValue(authenticationOptions),
      finishAuthentication: vi.fn().mockResolvedValue({ verified: true }),
      beginPaymentStepUp: vi.fn(),
      finishPaymentStepUp: vi.fn(),
    };

    const webAuthn = {
      createCredential: vi.fn(),
      getAssertion: vi.fn().mockResolvedValue(assertion),
    };

    const service = new PasskeyAuthService(
      adapter,
      webAuthn as unknown as never,
    );

    await service.login({ username: "demo@example.com" });
    await service.confirmSensitiveAction({ userId: "user-1" });

    expect(adapter.beginAuthentication).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ purpose: "login" }),
    );
    expect(adapter.beginAuthentication).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ purpose: "sensitive-action" }),
    );
  });
});
