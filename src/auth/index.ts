import type { PasskeyBackendAdapter } from '../adapters';
import { WebAuthnService } from '../webauthn';
import type { AuthenticationVerificationResult, BeginAuthenticationInput, BeginRegistrationInput, RegistrationVerificationResult } from '../types';

/**
 * High-level passkey service for registration and website authentication.
 */
export class PasskeyAuthService {
    /**
     * Creates auth service with pluggable backend adapter.
     */
    constructor(
        private readonly adapter: PasskeyBackendAdapter,
        private readonly webAuthn = new WebAuthnService(),
    ) {}

    /**
     * Registers a new passkey for user login.
     */
    public async register(input: BeginRegistrationInput): Promise<RegistrationVerificationResult> {
        const options = await this.adapter.beginRegistration(input);
        const attestation = await this.webAuthn.createCredential(options);

        return this.adapter.finishRegistration({
            userId: input.user.id,
            credential: attestation,
            ...(options.challengeId ? { challengeId: options.challengeId } : {}),
            ...(input.context ? { context: input.context } : {}),
        });
    }

    /**
     * Authenticates a user for standard website login.
     */
    public async login(input: Omit<BeginAuthenticationInput, 'purpose'>): Promise<AuthenticationVerificationResult> {
        return this.authenticate({
            ...input,
            purpose: 'login',
        });
    }

    /**
     * Authenticates a user before a sensitive action.
     */
    public async confirmSensitiveAction(input: Omit<BeginAuthenticationInput, 'purpose'>): Promise<AuthenticationVerificationResult> {
        return this.authenticate({
            ...input,
            purpose: 'sensitive-action',
        });
    }

    /**
     * Runs generic passkey authentication flow for any non-payment purpose.
     */
    public async authenticate(input: BeginAuthenticationInput): Promise<AuthenticationVerificationResult> {
        const options = await this.adapter.beginAuthentication(input);
        const assertion = await this.webAuthn.getAssertion(options);

        return this.adapter.finishAuthentication({
            credential: assertion,
            ...(options.challengeId ? { challengeId: options.challengeId } : {}),
            ...(input.purpose ? { purpose: input.purpose } : {}),
            ...(input.context ? { context: input.context } : {}),
        });
    }
}
