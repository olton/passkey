import { PasskeyAuthService } from '../auth';
import { AccountService, CardService } from '../payments';
import type {
    AuthenticationVerificationResult,
    BeginAuthenticationInput,
    BeginPaymentStepUpInput,
    CardTokenCheckoutResult,
    ConfirmCardTokenCheckoutInput,
    PaymentStepUpResult,
} from '../types';
import { DEFAULT_LOCALE, t } from '../i18n';

/**
 * Input for login use-case.
 */
export interface LoginUseCaseRequest {
    scenario: 'login';
    input: Omit<BeginAuthenticationInput, 'purpose'>;
}

/**
 * Input for payment step-up use-case.
 */
export interface PaymentStepUpUseCaseRequest {
    scenario: 'payment-step-up';
    input: BeginPaymentStepUpInput;
}

/**
 * Input for isolated card/token payment step-up use-case.
 */
export interface PaymentCardTokenStepUpUseCaseRequest {
    scenario: 'payment-card-token-step-up';
    input: ConfirmCardTokenCheckoutInput;
}

/**
 * Input for sensitive action confirmation use-case.
 */
export interface SensitiveActionUseCaseRequest {
    scenario: 'sensitive-action';
    input: Omit<BeginAuthenticationInput, 'purpose'>;
}

/**
 * Input for passwordless account recovery use-case.
 */
export interface PasswordlessRecoveryUseCaseRequest {
    scenario: 'passwordless-recovery';
    input: Omit<BeginAuthenticationInput, 'purpose'>;
}

/**
 * Discriminated union of all supported web-client passkey use-cases.
 */
export type WebClientUseCaseRequest = LoginUseCaseRequest | PaymentStepUpUseCaseRequest | PaymentCardTokenStepUpUseCaseRequest | SensitiveActionUseCaseRequest | PasswordlessRecoveryUseCaseRequest;

/**
 * Unified response for passkey use-case orchestrator.
 */
export type WebClientUseCaseResponse = AuthenticationVerificationResult | PaymentStepUpResult | CardTokenCheckoutResult;

/**
 * Facade that maps business scenarios to underlying auth/payment services.
 */
export class WebClientUseCases {
    /**
     * Creates orchestrator instance.
     */
    constructor(
        private readonly auth: PasskeyAuthService,
        private readonly payments: AccountService,
        private readonly locale: string = DEFAULT_LOCALE,
        private readonly cardPayments?: CardService,
    ) {}

    /**
     * Runs scenario-specific passkey flow.
     */
    public async run(request: WebClientUseCaseRequest): Promise<WebClientUseCaseResponse> {
        switch (request.scenario) {
            case 'login':
                return this.auth.login(request.input);
            case 'payment-step-up':
                return this.payments.confirmPayment(request.input);
            case 'payment-card-token-step-up':
                if (!this.cardPayments) {
                    throw new Error(t(this.locale, 'errors.useCases.cardTokenUnavailable', 'Card/token checkout use-case is not configured.'));
                }

                return this.cardPayments.confirm(request.input);
            case 'sensitive-action':
                return this.auth.confirmSensitiveAction(request.input);
            case 'passwordless-recovery':
                return this.auth.authenticate({
                    ...request.input,
                    purpose: 'passwordless-recovery',
                });
            default:
                return assertNever(request, this.locale);
        }
    }
}

/**
 * Exhaustiveness check for scenario switch.
 */
function assertNever(value: never, locale: string): never {
    throw new Error(`${t(locale, 'errors.useCases.unsupportedScenario', 'Unsupported scenario payload')}: ${String(value)}`);
}
