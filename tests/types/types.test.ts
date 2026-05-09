import { describe, expect, it } from "vitest";
import {
  CardTokenAuthDecision,
  CardTokenGatewayStatus,
  StepUpDecision,
} from "../../src/types";
import type {
  BeginAuthenticationInput,
  ConfirmCardTokenCheckoutInput,
  BeginPaymentStepUpInput,
  BeginRegistrationInput,
  WebClientScenario,
} from "../../src/types";

describe("types module", () => {
  it("accepts strongly-typed registration and authentication payloads", () => {
    const registration: BeginRegistrationInput = {
      user: {
        id: "user_1",
        username: "demo@example.com",
        displayName: "Demo User",
      },
      context: {
        source: "test",
      },
    };

    const authentication: BeginAuthenticationInput = {
      username: "demo@example.com",
      purpose: "login",
    };

    const payment: BeginPaymentStepUpInput = {
      payment: {
        paymentIntentId: "pi_1",
        amountMinor: 5000,
        currency: "UAH",
        merchantId: "merchant_1",
      },
      userId: "user_1",
    };

    const cardTokenCheckout: ConfirmCardTokenCheckoutInput = {
      payment: {
        paymentIntentId: "pi_ct_1",
        amountMinor: 1500,
        currency: "UAH",
        merchantId: "merchant_1",
      },
      instrument: {
        type: "token",
        tokenId: "tok_1",
      },
    };

    const decision: StepUpDecision = StepUpDecision.EnrollmentRequired;
    const cardTokenDecision: CardTokenAuthDecision = CardTokenAuthDecision.Approved;
    const gatewayStatus: CardTokenGatewayStatus = CardTokenGatewayStatus.Success;
    const scenario: WebClientScenario = "payment-step-up";

    expect(registration.user.id).toBe("user_1");
    expect(authentication.purpose).toBe("login");
    expect(payment.payment.currency).toBe("UAH");
    expect(cardTokenCheckout.instrument.type).toBe("token");
    expect(decision).toBe(StepUpDecision.EnrollmentRequired);
    expect(cardTokenDecision).toBe(CardTokenAuthDecision.Approved);
    expect(gatewayStatus).toBe(CardTokenGatewayStatus.Success);
    expect(scenario).toContain("payment");
  });
});
