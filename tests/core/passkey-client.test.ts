import { describe, expect, it, vi } from "vitest";
import { createPasskeyClient } from "../../src/core";
import type { PasskeyBackendAdapter } from "../../src/adapters";
import type {
  CredentialAssertionJSON,
  CredentialAttestationJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "../../src/types";
import { StepUpDecision } from "../../src/types";

const registrationOptions: PublicKeyCredentialCreationOptionsJSON = {
  challenge: "reg-challenge",
  challengeId: "reg-1",
  rp: { id: "localhost", name: "Demo" },
  user: {
    id: "dXNlcjE",
    name: "demo@example.com",
    displayName: "Demo User",
  },
  pubKeyCredParams: [{ type: "public-key", alg: -7 }],
};

const authOptions: PublicKeyCredentialRequestOptionsJSON = {
  challenge: "auth-challenge",
  challengeId: "auth-1",
  rpId: "localhost",
};

const paymentOptions: PublicKeyCredentialRequestOptionsJSON = {
  challenge: "payment-challenge",
  challengeId: "pay-1",
  rpId: "localhost",
};

const attestation: CredentialAttestationJSON = {
  id: "cred-1",
  rawId: "raw-1",
  type: "public-key",
  response: {
    clientDataJSON: "cdj",
    attestationObject: "att",
  },
  clientExtensionResults: {},
};

const assertion: CredentialAssertionJSON = {
  id: "assert-1",
  rawId: "raw-2",
  type: "public-key",
  response: {
    clientDataJSON: "cdj",
    authenticatorData: "auth-data",
    signature: "sig",
  },
  clientExtensionResults: {},
};

describe("PasskeyClient", () => {
  it("runs register, login, payment and use-case flows", async () => {
    const adapter: PasskeyBackendAdapter = {
      beginRegistration: vi.fn().mockResolvedValue(registrationOptions),
      finishRegistration: vi.fn().mockResolvedValue({ verified: true, credentialId: "cred-1" }),
      beginAuthentication: vi.fn().mockResolvedValue(authOptions),
      finishAuthentication: vi.fn().mockResolvedValue({ verified: true, levelOfAssurance: "high" }),
      beginPaymentStepUp: vi.fn().mockResolvedValue(paymentOptions),
      finishPaymentStepUp: vi.fn().mockResolvedValue({ decision: StepUpDecision.Approved }),
    };

    const webAuthn = {
      isSupported: vi.fn().mockReturnValue(true),
      createCredential: vi.fn().mockResolvedValue(attestation),
      getAssertion: vi.fn().mockResolvedValue(assertion),
    };

    const client = createPasskeyClient({
      adapter,
      webAuthnService: webAuthn as unknown as never,
    });

    const registrationResult = await client.register({
      user: {
        id: "user-1",
        username: "demo@example.com",
        displayName: "Demo User",
      },
    });

    const loginResult = await client.login({
      username: "demo@example.com",
    });

    const paymentResult = await client.confirmPayment({
      payment: {
        paymentIntentId: "pi_1",
        amountMinor: 1000,
        currency: "UAH",
        merchantId: "merchant_1",
      },
    });

    const useCaseResult = await client.runUseCase({
      scenario: "passwordless-recovery",
      input: {
        username: "demo@example.com",
      },
    });

    expect(registrationResult.verified).toBe(true);
    expect(loginResult.verified).toBe(true);
    expect(paymentResult.decision).toBe(StepUpDecision.Approved);
    expect(useCaseResult).toMatchObject({ verified: true });

    expect(adapter.beginRegistration).toHaveBeenCalledTimes(1);
    expect(adapter.beginAuthentication).toHaveBeenCalledTimes(2);
    expect(adapter.beginPaymentStepUp).toHaveBeenCalledTimes(1);
    expect(webAuthn.createCredential).toHaveBeenCalledTimes(1);
    expect(webAuthn.getAssertion).toHaveBeenCalledTimes(3);
  });
});
