import { describe, expect, it, vi } from 'vitest';
import { CardService } from '../../src/payments';
import type {
    CardTokenPasskeyBackendAdapter,
    PasskeyBackendAdapter,
} from '../../src/adapters';
import { UserCancelledError } from '../../src/errors';
import {
    CardTokenAuthDecision,
    CardTokenEnrollmentOutcome,
    CardTokenGatewayStatus,
    type CredentialAssertionJSON,
    type CredentialAttestationJSON,
    type PublicKeyCredentialCreationOptionsJSON,
    type PublicKeyCredentialRequestOptionsJSON,
} from '../../src/types';

const assertion: CredentialAssertionJSON = {
    id: 'assert-1',
    rawId: 'raw-1',
    type: 'public-key',
    response: {
        clientDataJSON: 'client',
        authenticatorData: 'auth',
        signature: 'sig',
    },
    clientExtensionResults: {},
};

const attestation: CredentialAttestationJSON = {
    id: 'att-1',
    rawId: 'raw-att-1',
    type: 'public-key',
    response: {
        clientDataJSON: 'client',
        attestationObject: 'attestation',
    },
    clientExtensionResults: {},
};

const requestOptions: PublicKeyCredentialRequestOptionsJSON = {
    challenge: 'challenge-1',
    challengeId: 'challenge-id-1',
    rpId: 'localhost',
};

const creationOptions: PublicKeyCredentialCreationOptionsJSON = {
    challenge: 'challenge-2',
    challengeId: 'challenge-id-2',
    rp: { id: 'localhost', name: 'Demo' },
    user: {
        id: 'dXNlcjE',
        name: 'demo@example.com',
        displayName: 'Demo User',
    },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
};

function createAdapter(): PasskeyBackendAdapter & CardTokenPasskeyBackendAdapter {
    return {
        beginRegistration: vi.fn(),
        finishRegistration: vi.fn(),
        beginAuthentication: vi.fn(),
        finishAuthentication: vi.fn(),
        beginPaymentStepUp: vi.fn(),
        finishPaymentStepUp: vi.fn(),
        beginCardTokenStepUp: vi.fn().mockResolvedValue(requestOptions),
        finishCardTokenStepUp: vi.fn().mockResolvedValue({
            authDecision: CardTokenAuthDecision.Approved,
            challengeId: 'challenge-id-1',
        }),
        authorizeCardTokenPayment: vi.fn().mockResolvedValue({
            gatewayStatus: CardTokenGatewayStatus.Success,
        }),
        beginCardTokenEnrollment: vi.fn().mockResolvedValue(creationOptions),
        finishCardTokenEnrollment: vi.fn().mockResolvedValue({
            outcome: CardTokenEnrollmentOutcome.Bound,
        }),
    };
}

describe('card token checkout service', () => {
    it('returns not_supported when WebAuthn is unavailable', async () => {
        const adapter = createAdapter();
        const webAuthn = {
            isSupported: vi.fn().mockReturnValue(false),
            getAssertion: vi.fn(),
            createCredential: vi.fn(),
        };

        const service = new CardService(adapter, webAuthn as unknown as never);

        const result = await service.confirm({
            payment: {
                paymentIntentId: 'pi_1',
                amountMinor: 1000,
                currency: 'UAH',
                merchantId: 'merchant_1',
            },
            instrument: {
                type: 'card',
                cardFingerprint: 'fp_1',
            },
        });

        expect(result.authDecision).toBe(CardTokenAuthDecision.NotSupported);
        expect(result.usedPasskey).toBe(false);
        expect(adapter.beginCardTokenStepUp).not.toHaveBeenCalled();
    });

    it('returns gateway success and enrollment offer when auth approved', async () => {
        const adapter = createAdapter();
        const webAuthn = {
            isSupported: vi.fn().mockReturnValue(true),
            getAssertion: vi.fn().mockResolvedValue(assertion),
            createCredential: vi.fn().mockResolvedValue(attestation),
        };

        const service = new CardService(adapter, webAuthn as unknown as never);

        const result = await service.confirm({
            payment: {
                paymentIntentId: 'pi_2',
                amountMinor: 2000,
                currency: 'UAH',
                merchantId: 'merchant_2',
            },
            instrument: {
                type: 'token',
                tokenId: 'tok_1',
            },
            passkeyAlreadyBound: false,
        });

        expect(result.authDecision).toBe(CardTokenAuthDecision.Approved);
        expect(result.gatewayStatus).toBe(CardTokenGatewayStatus.Success);
        expect(result.shouldOfferEnrollment).toBe(true);
        expect(result.usedPasskey).toBe(true);
        expect(adapter.beginCardTokenStepUp).toHaveBeenCalledTimes(1);
        expect(adapter.authorizeCardTokenPayment).toHaveBeenCalledTimes(1);
    });

    it('returns cancelled when user aborts passkey ceremony', async () => {
        const adapter = createAdapter();
        const webAuthn = {
            isSupported: vi.fn().mockReturnValue(true),
            getAssertion: vi.fn().mockRejectedValue(new UserCancelledError()),
            createCredential: vi.fn().mockResolvedValue(attestation),
        };

        const service = new CardService(adapter, webAuthn as unknown as never);

        const result = await service.confirm({
            payment: {
                paymentIntentId: 'pi_3',
                amountMinor: 3000,
                currency: 'UAH',
                merchantId: 'merchant_3',
            },
            instrument: {
                type: 'card',
                cardFingerprint: 'fp_3',
            },
        });

        expect(result.authDecision).toBe(CardTokenAuthDecision.Cancelled);
        expect(result.usedPasskey).toBe(false);
        expect(result.shouldOfferEnrollment).toBe(false);
        expect(adapter.finishCardTokenStepUp).not.toHaveBeenCalled();
        expect(adapter.authorizeCardTokenPayment).not.toHaveBeenCalled();
    });

    it('maps enrollment cancellation to skipped_by_user', async () => {
        const adapter = createAdapter();
        const webAuthn = {
            isSupported: vi.fn().mockReturnValue(true),
            getAssertion: vi.fn().mockResolvedValue(assertion),
            createCredential: vi.fn().mockRejectedValue(new UserCancelledError()),
        };

        const service = new CardService(adapter, webAuthn as unknown as never);

        const result = await service.enroll({
            payment: {
                paymentIntentId: 'pi_4',
                amountMinor: 4000,
                currency: 'UAH',
                merchantId: 'merchant_4',
            },
            instrument: {
                type: 'token',
                tokenId: 'tok_4',
            },
            user: {
                id: 'user_4',
                username: 'demo4@example.com',
                displayName: 'Demo 4',
            },
        });

        expect(result.outcome).toBe(CardTokenEnrollmentOutcome.SkippedByUser);
        expect(adapter.finishCardTokenEnrollment).not.toHaveBeenCalled();
    });
});
