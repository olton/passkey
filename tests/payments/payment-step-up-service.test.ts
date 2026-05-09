import { describe, expect, it, vi } from "vitest";
import { PaymentStepUpService } from "../../src/payments";
import type { PasskeyBackendAdapter } from "../../src/adapters";
import { BackendAdapterError } from "../../src/errors";
import type {
  CredentialAssertionJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "../../src/types";
import { StepUpDecision } from "../../src/types";

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

    const result = await service.confirmPayment({
      payment: {
        paymentIntentId: "pi_1",
        amountMinor: 1000,
        currency: "UAH",
        merchantId: "merchant-1",
      },
    });

    expect(result.decision).toBe(StepUpDecision.FallbackTo3DS);
    expect(result.decision).toBe(StepUpDecision.FallbackTo3DS);
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
        decision: StepUpDecision.Approved,
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

    const result = await service.confirmPayment({
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
    expect(result.decision).toBe(StepUpDecision.Approved);
  });

  it("returns enrollment_required when backend indicates missing enrollment", async () => {
    const adapter: PasskeyBackendAdapter = {
      beginRegistration: vi.fn(),
      finishRegistration: vi.fn(),
      beginAuthentication: vi.fn(),
      finishAuthentication: vi.fn(),
      beginPaymentStepUp: vi.fn().mockRejectedValue(
        new BackendAdapterError("missing credential", {
          status: 404,
          details: {
            error: {
              code: "credential_not_found",
            },
          },
        }),
      ),
      finishPaymentStepUp: vi.fn(),
    };

    const webAuthn = {
      isSupported: vi.fn().mockReturnValue(true),
      getAssertion: vi.fn().mockResolvedValue(assertion),
    };

    const service = new PaymentStepUpService(
      adapter,
      webAuthn as unknown as never,
    );

    const result = await service.confirmPayment({
      payment: {
        paymentIntentId: "pi_2",
        amountMinor: 2000,
        currency: "UAH",
        merchantId: "merchant-2",
      },
    });

    expect(result.decision).toBe(StepUpDecision.EnrollmentRequired);
    expect(result.code).toBe("enrollment_required");
    expect(result.usedPasskey).toBe(false);
    expect(adapter.beginPaymentStepUp).toHaveBeenCalledTimes(1);
    expect(webAuthn.getAssertion).not.toHaveBeenCalled();
  });
});
