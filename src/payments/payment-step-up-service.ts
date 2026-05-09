import type { PasskeyBackendAdapter } from '../adapters';
import { BackendAdapterError } from '../errors';
import { WebAuthnService } from '../webauthn';
import type { BeginPaymentStepUpInput, PaymentStepUpResult } from '../types';
import { StepUpDecision } from '../types';
import { DEFAULT_LOCALE, t } from '../i18n';

/**
 * Orchestrates account-level passkey payment step-up flow.
 *
 * Note: enrollment policy is backend-driven. This service reports decisions,
 * but does not enforce a specific product policy (mandatory vs optional enrollment).
 */
export class PaymentStepUpService {
    /**
     * Creates service with backend adapter and WebAuthn transport.
     */
    constructor(
        private readonly adapter: PasskeyBackendAdapter,
        private readonly webAuthn = new WebAuthnService(),
        private readonly locale: string = DEFAULT_LOCALE,
    ) {}

    /**
     * Confirms payment using an already enrolled account passkey.
     */
    public async confirmPayment(input: BeginPaymentStepUpInput): Promise<PaymentStepUpResult> {
        if (!this.webAuthn.isSupported()) {
            return {
                decision: StepUpDecision.FallbackTo3DS,
                code: 'passkey_not_supported',
                usedPasskey: false,
                message: t(this.locale, 'payments.stepUp.passkeyNotSupported', 'Browser does not support passkeys, fallback to 3DS is required.'),
            };
        }

        try {
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
            };
        } catch (error) {
            if (isEnrollmentRequiredError(error)) {
                return {
                    decision: StepUpDecision.EnrollmentRequired,
                    code: 'enrollment_required',
                    usedPasskey: false,
                    message: t(
                        this.locale,
                        'payments.stepUp.enrollmentRequired',
                        'No enrolled payment passkey found for this account. Follow backend/product policy for verification, enrollment, or fallback.',
                    ),
                };
            }

            throw error;
        }
    }
}

/**
 * Detects backend errors that mean payment passkey enrollment is required.
 */
function isEnrollmentRequiredError(error: unknown): boolean {
    if (!(error instanceof BackendAdapterError)) {
        return false;
    }

    const details = typeof error.details === 'object' && error.details !== null ? (error.details as Record<string, unknown>) : undefined;

    const nestedError = details && typeof details['error'] === 'object' && details['error'] !== null ? (details['error'] as Record<string, unknown>) : undefined;

    const code =
        typeof nestedError?.['code'] === 'string' ? nestedError['code']
        : typeof details?.['code'] === 'string' ? details['code']
        : undefined;

    const requiresReRegistration = nestedError?.['requiresReRegistration'] === true || details?.['requiresReRegistration'] === true;

    return code === 'enrollment_required' || code === 'credential_not_found' || requiresReRegistration;
}
