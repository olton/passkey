import type { PasskeyBackendAdapter } from "../adapters";
import { PasskeyAuthService } from "../auth";
import { AccountService, CardService } from "../payments";
import { WebAuthnService } from "../webauthn";
import {
  WebClientUseCases,
  type WebClientUseCaseRequest,
  type WebClientUseCaseResponse,
} from "../use-cases";
import type {
  AuthenticationVerificationResult,
  BeginCardTokenEnrollmentInput,
  ConfirmCardTokenCheckoutInput,
  BeginAuthenticationInput,
  BeginPaymentStepUpInput,
  BeginRegistrationInput,
  CardTokenCheckoutResult,
  CardTokenEnrollmentResult,
  PaymentStepUpResult,
  RegistrationVerificationResult,
} from "../types";
import { DEFAULT_LOCALE } from "../i18n";

/**
 * SDK configuration required to create a passkey client instance.
 */
export interface PasskeyClientConfig {
  adapter: PasskeyBackendAdapter;
  webAuthnService?: WebAuthnService;
  locale?: string;
}

/**
 * Main facade that exposes auth, payment and scenario-level passkey APIs.
 */
export class PasskeyClient {
  public readonly auth: PasskeyAuthService;
  public readonly payments: AccountService;
  public readonly cardPayments: CardService;
  public readonly useCases: WebClientUseCases;

  /**
   * Creates a passkey client with fully wired services.
   */
  constructor(config: PasskeyClientConfig) {
    const locale = config.locale ?? DEFAULT_LOCALE;
    const webAuthn = config.webAuthnService ?? new WebAuthnService(locale);
    this.auth = new PasskeyAuthService(config.adapter, webAuthn);
    this.payments = new AccountService(config.adapter, webAuthn, locale);
    this.cardPayments = new CardService(config.adapter, webAuthn, locale);
    this.useCases = new WebClientUseCases(this.auth, this.payments, locale, this.cardPayments);
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
   * Performs passkey step-up for payment authorization.
   */
  public confirmPayment(
    input: BeginPaymentStepUpInput,
  ): Promise<PaymentStepUpResult> {
    return this.payments.confirmPayment(input);
  }

  /**
   * Performs isolated card checkout step-up + payment authorization flow.
   */
  public confirmCardCheckout(
    input: ConfirmCardTokenCheckoutInput,
  ): Promise<CardTokenCheckoutResult> {
    return this.cardPayments.confirm(input);
  }

  /**
   * Performs optional post-payment passkey enrollment for card binding.
   */
  public enrollCardPasskey(
    input: BeginCardTokenEnrollmentInput,
  ): Promise<CardTokenEnrollmentResult> {
    return this.cardPayments.enroll(input);
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
