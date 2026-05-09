import type {
    CardTokenPasskeyBackendAdapter,
    PasskeyBackendAdapter,
} from '../adapters';
import { UserCancelledError } from '../errors';
import { DEFAULT_LOCALE, t } from '../i18n';
import {
    CardTokenAuthDecision,
    CardTokenEnrollmentOutcome,
    CardTokenGatewayStatus,
    type BeginCardTokenEnrollmentInput,
    type CardTokenCheckoutResult,
    type CardTokenEnrollmentResult,
    type ConfirmCardTokenCheckoutInput,
} from '../types';
import { WebAuthnService } from '../webauthn';

/**
 * Orchestrates isolated card/token checkout passkey flow.
 */
export class CardService {
    /**
     * Creates isolated card/token checkout service.
     */
    constructor(
        private readonly adapter: PasskeyBackendAdapter,
        private readonly webAuthn = new WebAuthnService(),
        private readonly locale: string = DEFAULT_LOCALE,
    ) {}

    /**
     * Confirms checkout for card/token flow and returns auth + gateway outcome.
     */
    public async confirm(input: ConfirmCardTokenCheckoutInput): Promise<CardTokenCheckoutResult> {
        if (!this.webAuthn.isSupported()) {
            return {
                authDecision: CardTokenAuthDecision.NotSupported,
                usedPasskey: false,
                shouldOfferEnrollment: false,
                code: 'passkey_not_supported',
                message: t(this.locale, 'payments.cardToken.passkeyNotSupported', 'Browser does not support passkeys for card/token checkout flow.'),
            };
        }

        const cardTokenAdapter = this.requireCardTokenAdapter();

        try {
            const options = await cardTokenAdapter.beginCardTokenStepUp({
                payment: input.payment,
                instrument: input.instrument,
                ...(input.userId ? { userId: input.userId } : {}),
                ...(input.context ? { context: input.context } : {}),
                ...(input.riskSignals ? { riskSignals: input.riskSignals } : {}),
            });

            const assertion = await this.webAuthn.getAssertion(options);

            const verification = await cardTokenAdapter.finishCardTokenStepUp({
                payment: input.payment,
                instrument: input.instrument,
                credential: assertion,
                ...(options.challengeId ? { challengeId: options.challengeId } : {}),
                ...(input.context ? { context: input.context } : {}),
            });

            if (verification.authDecision !== CardTokenAuthDecision.Approved) {
                return {
                    authDecision: verification.authDecision,
                    usedPasskey: true,
                    shouldOfferEnrollment: false,
                    ...(verification.code ? { code: verification.code } : {}),
                    ...(verification.message ? { message: verification.message } : {}),
                };
            }

            const authorization = await cardTokenAdapter.authorizeCardTokenPayment({
                payment: input.payment,
                instrument: input.instrument,
                ...(verification.challengeId ? { challengeId: verification.challengeId } : {}),
                ...(input.context ? { context: input.context } : {}),
            });

            return {
                authDecision: verification.authDecision,
                gatewayStatus: authorization.gatewayStatus,
                usedPasskey: true,
                shouldOfferEnrollment: authorization.gatewayStatus === CardTokenGatewayStatus.Success && !input.passkeyAlreadyBound,
                ...(authorization.code ? { code: authorization.code } : {}),
                ...(authorization.message ? { message: authorization.message } : {}),
            };
        } catch (error) {
            if (error instanceof UserCancelledError) {
                return {
                    authDecision: CardTokenAuthDecision.Cancelled,
                    usedPasskey: false,
                    shouldOfferEnrollment: false,
                    code: 'user_cancelled',
                    message: t(this.locale, 'payments.cardToken.cancelled', 'User cancelled card/token passkey ceremony.'),
                };
            }

            throw error;
        }
    }

    /**
     * Performs optional post-payment passkey enrollment for card/token binding.
     */
    public async enroll(input: BeginCardTokenEnrollmentInput): Promise<CardTokenEnrollmentResult> {
        if (!this.webAuthn.isSupported()) {
            return {
                outcome: CardTokenEnrollmentOutcome.Failed,
                code: 'passkey_not_supported',
                message: t(this.locale, 'payments.cardToken.passkeyNotSupported', 'Browser does not support passkeys for card/token checkout flow.'),
            };
        }

        const cardTokenAdapter = this.requireCardTokenAdapter();

        try {
            const options = await cardTokenAdapter.beginCardTokenEnrollment(input);
            const credential = await this.webAuthn.createCredential(options);

            return cardTokenAdapter.finishCardTokenEnrollment({
                payment: input.payment,
                instrument: input.instrument,
                userId: input.user.id,
                credential,
                ...(options.challengeId ? { challengeId: options.challengeId } : {}),
                ...(input.context ? { context: input.context } : {}),
            });
        } catch (error) {
            if (error instanceof UserCancelledError) {
                return {
                    outcome: CardTokenEnrollmentOutcome.SkippedByUser,
                    code: 'user_cancelled',
                    message: t(this.locale, 'payments.cardToken.cancelled', 'User cancelled card/token passkey ceremony.'),
                };
            }

            throw error;
        }
    }

    /**
     * Ensures adapter supports isolated card/token passkey contract.
     */
    private requireCardTokenAdapter(): CardTokenPasskeyBackendAdapter {
        const candidate = this.adapter as Partial<CardTokenPasskeyBackendAdapter>;
        if (
            typeof candidate.beginCardTokenStepUp !== 'function'
            || typeof candidate.finishCardTokenStepUp !== 'function'
            || typeof candidate.authorizeCardTokenPayment !== 'function'
            || typeof candidate.beginCardTokenEnrollment !== 'function'
            || typeof candidate.finishCardTokenEnrollment !== 'function'
        ) {
            throw new Error(t(this.locale, 'payments.cardToken.adapterUnsupported', 'Adapter does not implement isolated card/token passkey contract.'));
        }

        return candidate as CardTokenPasskeyBackendAdapter;
    }
}
