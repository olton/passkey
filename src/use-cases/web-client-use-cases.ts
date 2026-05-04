import { PasskeyAuthService } from "../auth";
import { PaymentStepUpService } from "../payments";
import type {
  AuthenticationVerificationResult,
  BeginAuthenticationInput,
  BeginPaymentStepUpInput,
  PaymentStepUpResult,
} from "../types";

/**
 * Input for login use-case.
 */
export interface LoginUseCaseRequest {
  scenario: "login";
  input: Omit<BeginAuthenticationInput, "purpose">;
}

/**
 * Input for payment step-up use-case.
 */
export interface PaymentStepUpUseCaseRequest {
  scenario: "payment-step-up";
  input: BeginPaymentStepUpInput;
}

/**
 * Input for sensitive action confirmation use-case.
 */
export interface SensitiveActionUseCaseRequest {
  scenario: "sensitive-action";
  input: Omit<BeginAuthenticationInput, "purpose">;
}

/**
 * Input for passwordless account recovery use-case.
 */
export interface PasswordlessRecoveryUseCaseRequest {
  scenario: "passwordless-recovery";
  input: Omit<BeginAuthenticationInput, "purpose">;
}

/**
 * Discriminated union of all supported web-client passkey use-cases.
 */
export type WebClientUseCaseRequest =
  | LoginUseCaseRequest
  | PaymentStepUpUseCaseRequest
  | SensitiveActionUseCaseRequest
  | PasswordlessRecoveryUseCaseRequest;

/**
 * Unified response for passkey use-case orchestrator.
 */
export type WebClientUseCaseResponse =
  | AuthenticationVerificationResult
  | PaymentStepUpResult;

/**
 * Facade that maps business scenarios to underlying auth/payment services.
 */
export class WebClientUseCases {
  /**
   * Creates orchestrator instance.
   */
  constructor(
    private readonly auth: PasskeyAuthService,
    private readonly payments: PaymentStepUpService,
  ) {}

  /**
   * Runs scenario-specific passkey flow.
   */
  public async run(
    request: WebClientUseCaseRequest,
  ): Promise<WebClientUseCaseResponse> {
    switch (request.scenario) {
      case "login":
        return this.auth.login(request.input);
      case "payment-step-up":
        return this.payments.confirmCardPayment(request.input);
      case "sensitive-action":
        return this.auth.confirmSensitiveAction(request.input);
      case "passwordless-recovery":
        return this.auth.authenticate({
          ...request.input,
          purpose: "passwordless-recovery",
        });
      default:
        return assertNever(request);
    }
  }
}

/**
 * Exhaustiveness check for scenario switch.
 */
function assertNever(value: never): never {
  throw new Error(`Unsupported scenario payload: ${String(value)}`);
}