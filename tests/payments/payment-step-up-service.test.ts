import { describe, expect, it, vi } from "vitest";
import { PaymentStepUpService } from "../../src/payments";
import type { PasskeyBackendAdapter } from "../../src/adapters";
import type {
  CredentialAssertionJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "../../src/types";

const assertion: CredentialAssertionJSON = {
  id: "assert-1",
  rawId: "raw-1",
  type: "public-key",
  response: {
    clientDataJSON: "client",
    authenticatorData: "auth",
    signature: "sig",
  },
  clientExtensionResults: {},
};

const options: PublicKeyCredentialRequestOptionsJSON = {
  challenge: "abc",
  challengeId: "challenge-payment-1",
  rpId: "localhost",
};

describe("payment step-up service", () => {
  it("returns 3DS fallback when WebAuthn is not supported", async () => {
    const adapter: PasskeyBackendAdapter = {
      beginRegistration: vi.fn(),
      finishRegistration: vi.fn(),
      beginAuthentication: vi.fn(),
      finishAuthentication: vi.fn(),
      beginPaymentStepUp: vi.fn(),
      finishPaymentStepUp: vi.fn(),
    };

    const webAuthn = {
      isSupported: vi.fn().mockReturnValue(false),
      getAssertion: vi.fn(),
    };

    const service = new PaymentStepUpService(
      adapter,
      webAuthn as unknown as never,
    );

    const result = await service.confirmCardPayment({
      payment: {
        paymentIntentId: "pi_1",
        amountMinor: 1000,
        currency: "UAH",
        merchantId: "merchant-1",
      },
    });

    expect(result.decision).toBe("fallback_to_3ds");
    expect(result.shouldTrigger3DS).toBe(true);
    expect(adapter.beginPaymentStepUp).not.toHaveBeenCalled();
  });

  it("returns passkey decision from backend", async () => {
    const adapter: PasskeyBackendAdapter = {
      beginRegistration: vi.fn(),
      finishRegistration: vi.fn(),
      beginAuthentication: vi.fn(),
      finishAuthentication: vi.fn(),
      beginPaymentStepUp: vi.fn().mockResolvedValue(options),
      finishPaymentStepUp: vi.fn().mockResolvedValue({
        decision: "approved",
        challengeId: "challenge-payment-1",
      }),
    };

    const webAuthn = {
      isSupported: vi.fn().mockReturnValue(true),
      getAssertion: vi.fn().mockResolvedValue(assertion),
    };

    const service = new PaymentStepUpService(
      adapter,
      webAuthn as unknown as never,
    );

    const result = await service.confirmCardPayment({
      payment: {
        paymentIntentId: "pi_1",
        amountMinor: 1000,
        currency: "UAH",
        merchantId: "merchant-1",
      },
    });

    expect(adapter.beginPaymentStepUp).toHaveBeenCalledTimes(1);
    expect(adapter.finishPaymentStepUp).toHaveBeenCalledWith(
      expect.objectContaining({
        challengeId: "challenge-payment-1",
        credential: assertion,
      }),
    );
    expect(result.usedPasskey).toBe(true);
    expect(result.shouldTrigger3DS).toBe(false);
  });
});
