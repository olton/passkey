import type { PasskeyBackendAdapter } from "../adapters";
import { WebAuthnService } from "../webauthn";
import type {
  BeginPaymentStepUpInput,
  PaymentStepUpResult,
} from "../types";

export interface CardFormProps {
  cardNumber: string;
  expirationMonth: string;
  expirationYear: string;
  cvc: string;
  cardHolderName?: string;
  email?: string;
}

/**
 * Orchestrates passkey-based card payment step-up flow.
 */
export class PaymentStepUpService {
  /**
   * Creates service with backend adapter and WebAuthn transport.
   */
  constructor(
    private readonly adapter: PasskeyBackendAdapter,
    private readonly webAuthn = new WebAuthnService(),
  ) {}

  /**
   * Confirms card payment using passkey as a 3DS alternative.
   */
  public async confirmCardPayment(
    input: BeginPaymentStepUpInput,
  ): Promise<PaymentStepUpResult> {
    if (!this.webAuthn.isSupported()) {
      return {
        decision: "fallback_to_3ds",
        usedPasskey: false,
        shouldTrigger3DS: true,
        message: "Browser does not support passkeys, fallback to 3DS is required.",
      };
    }

    const options = await this.adapter.beginPaymentStepUp(input);
    const assertion = await this.webAuthn.getAssertion(options);
    const verification = await this.adapter.finishPaymentStepUp({
      payment: input.payment,
      credential: assertion,
      ...(options.challengeId ? { challengeId: options.challengeId } : {}),
      ...(input.context ? { context: input.context } : {}),
    });

    return {
      ...verification,
      usedPasskey: true,
      shouldTrigger3DS: verification.decision === "fallback_to_3ds",
    };
  }
}