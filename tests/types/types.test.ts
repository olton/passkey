import { describe, expect, it } from "vitest";
import type {
  BeginAuthenticationInput,
  BeginPaymentStepUpInput,
  BeginRegistrationInput,
  StepUpDecision,
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

    const decision: StepUpDecision = "approved";
    const scenario: WebClientScenario = "payment-step-up";

    expect(registration.user.id).toBe("user_1");
    expect(authentication.purpose).toBe("login");
    expect(payment.payment.currency).toBe("UAH");
    expect(decision).toBe("approved");
    expect(scenario).toContain("payment");
  });
});
