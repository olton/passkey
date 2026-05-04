import type { PasskeyBackendAdapter } from "../adapters";
import { PasskeyAuthService } from "../auth";
import { PaymentStepUpService } from "../payments";
import { WebAuthnService } from "../webauthn";
import {
  WebClientUseCases,
  type WebClientUseCaseRequest,
  type WebClientUseCaseResponse,
} from "../use-cases";
import type {
  AuthenticationVerificationResult,
  BeginAuthenticationInput,
  BeginPaymentStepUpInput,
  BeginRegistrationInput,
  PaymentStepUpResult,
  RegistrationVerificationResult,
} from "../types";

/**
 * SDK configuration required to create a passkey client instance.
 */
export interface PasskeyClientConfig {
  adapter: PasskeyBackendAdapter;
  webAuthnService?: WebAuthnService;
}

/**
 * Main facade that exposes auth, payment and scenario-level passkey APIs.
 */
export class PasskeyClient {
  public readonly auth: PasskeyAuthService;
  public readonly payments: PaymentStepUpService;
  public readonly useCases: WebClientUseCases;

  /**
   * Creates a passkey client with fully wired services.
   */
  constructor(config: PasskeyClientConfig) {
    const webAuthn = config.webAuthnService ?? new WebAuthnService();
    this.auth = new PasskeyAuthService(config.adapter, webAuthn);
    this.payments = new PaymentStepUpService(config.adapter, webAuthn);
    this.useCases = new WebClientUseCases(this.auth, this.payments);
  }

  /**
   * Registers a passkey for user account.
   */
  public register(
    input: BeginRegistrationInput,
  ): Promise<RegistrationVerificationResult> {
    return this.auth.register(input);
  }

  /**
   * Performs passkey login.
   */
  public login(
    input: Omit<BeginAuthenticationInput, "purpose">,
  ): Promise<AuthenticationVerificationResult> {
    return this.auth.login(input);
  }

  /**
   * Performs passkey confirmation for sensitive operation.
   */
  public confirmSensitiveAction(
    input: Omit<BeginAuthenticationInput, "purpose">,
  ): Promise<AuthenticationVerificationResult> {
    return this.auth.confirmSensitiveAction(input);
  }

  /**
   * Performs passkey step-up for card payment authorization.
   */
  public confirmCardPayment(
    input: BeginPaymentStepUpInput,
  ): Promise<PaymentStepUpResult> {
    return this.payments.confirmCardPayment(input);
  }

  /**
   * Executes scenario-oriented passkey flow.
   */
  public runUseCase(
    request: WebClientUseCaseRequest,
  ): Promise<WebClientUseCaseResponse> {
    return this.useCases.run(request);
  }
}

/**
 * Factory function for creating passkey client facade.
 */
export function createPasskeyClient(config: PasskeyClientConfig): PasskeyClient {
  return new PasskeyClient(config);
}