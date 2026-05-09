import { describe, expect, it, vi } from "vitest";
import { WebClientUseCases } from "../../src/use-cases";
import { CardTokenAuthDecision, StepUpDecision } from "../../src/types";

describe("WebClientUseCases", () => {
  it("routes each scenario to corresponding service method", async () => {
    const auth = {
      login: vi.fn().mockResolvedValue({ verified: true, from: "login" }),
      confirmSensitiveAction: vi.fn().mockResolvedValue({ verified: true, from: "sensitive" }),
      authenticate: vi.fn().mockResolvedValue({ verified: true, from: "recovery" }),
    };

    const payments = {
      confirmPayment: vi.fn().mockResolvedValue({
        decision: StepUpDecision.Approved,
        usedPasskey: true,
      }),
    };

    const cardPayments = {
      confirm: vi.fn().mockResolvedValue({
        authDecision: CardTokenAuthDecision.Approved,
        usedPasskey: true,
        shouldOfferEnrollment: true,
      }),
    };

    const useCases = new WebClientUseCases(
      auth as unknown as never,
      payments as unknown as never,
      "en",
      cardPayments as unknown as never,
    );

    const loginResult = await useCases.run({
      scenario: "login",
      input: { username: "demo@example.com" },
    });

    const paymentResult = await useCases.run({
      scenario: "payment-step-up",
      input: {
        payment: {
          paymentIntentId: "pi_1",
          amountMinor: 1000,
          currency: "UAH",
          merchantId: "merchant_1",
        },
      },
    });

    const sensitiveResult = await useCases.run({
      scenario: "sensitive-action",
      input: { userId: "user_1" },
    });

    const cardTokenResult = await useCases.run({
      scenario: "payment-card-token-step-up",
      input: {
        payment: {
          paymentIntentId: "pi_2",
          amountMinor: 1300,
          currency: "UAH",
          merchantId: "merchant_1",
        },
        instrument: {
          type: "token",
          tokenId: "tok_1",
        },
      },
    });

    const recoveryResult = await useCases.run({
      scenario: "passwordless-recovery",
      input: { username: "demo@example.com" },
    });

    expect(auth.login).toHaveBeenCalledTimes(1);
    expect(payments.confirmPayment).toHaveBeenCalledTimes(1);
    expect(cardPayments.confirm).toHaveBeenCalledTimes(1);
    expect(auth.confirmSensitiveAction).toHaveBeenCalledTimes(1);
    expect(auth.authenticate).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: "passwordless-recovery" }),
    );

    expect(loginResult).toMatchObject({ verified: true, from: "login" });
    expect(paymentResult).toMatchObject({ decision: StepUpDecision.Approved });
    expect(cardTokenResult).toMatchObject({ authDecision: CardTokenAuthDecision.Approved });
    expect(sensitiveResult).toMatchObject({ from: "sensitive" });
    expect(recoveryResult).toMatchObject({ from: "recovery" });
  });
});
