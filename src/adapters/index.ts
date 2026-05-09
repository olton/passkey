import { BackendAdapterError } from '../errors';
import type {
    AuthorizeCardTokenPaymentInput,
    AuthorizeCardTokenPaymentResult,
    AuthenticationVerificationResult,
    BeginCardTokenEnrollmentInput,
    BeginCardTokenStepUpInput,
    BeginAuthenticationInput,
    BeginPaymentStepUpInput,
    BeginRegistrationInput,
    CardTokenEnrollmentResult,
    CardTokenStepUpVerificationResult,
    FinishCardTokenEnrollmentInput,
    FinishCardTokenStepUpInput,
    FinishAuthenticationInput,
    FinishPaymentStepUpInput,
    FinishRegistrationInput,
    PaymentStepUpVerificationResult,
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
    RegistrationVerificationResult,
} from '../types';

/**
 * Backend API contract for passkey flows.
 */
export interface PasskeyBackendAdapter {
    /**
     * Requests WebAuthn creation options for passkey registration.
     */
    beginRegistration(input: BeginRegistrationInput): Promise<PublicKeyCredentialCreationOptionsJSON>;

    /**
     * Verifies registration attestation and persists credential metadata.
     */
    finishRegistration(input: FinishRegistrationInput): Promise<RegistrationVerificationResult>;

    /**
     * Requests WebAuthn assertion options for user authentication.
     */
    beginAuthentication(input: BeginAuthenticationInput): Promise<PublicKeyCredentialRequestOptionsJSON>;

    /**
     * Verifies assertion and creates or refreshes authenticated session.
     */
    finishAuthentication(input: FinishAuthenticationInput): Promise<AuthenticationVerificationResult>;

    /**
     * Requests WebAuthn assertion options for card payment step-up.
     */
    beginPaymentStepUp(input: BeginPaymentStepUpInput): Promise<PublicKeyCredentialRequestOptionsJSON>;

    /**
     * Verifies passkey assertion for payment confirmation.
     */
    finishPaymentStepUp(input: FinishPaymentStepUpInput): Promise<PaymentStepUpVerificationResult>;
}

/**
 * Optional backend API contract for isolated card/token passkey checkout flow.
 */
export interface CardTokenPasskeyBackendAdapter {
    /**
     * Requests WebAuthn assertion options for card/token checkout step-up.
     */
    beginCardTokenStepUp(input: BeginCardTokenStepUpInput): Promise<PublicKeyCredentialRequestOptionsJSON>;

    /**
     * Verifies card/token passkey assertion for checkout step-up.
     */
    finishCardTokenStepUp(input: FinishCardTokenStepUpInput): Promise<CardTokenStepUpVerificationResult>;

    /**
     * Runs final payment authorization in gateway/PSP rails.
     */
    authorizeCardTokenPayment(input: AuthorizeCardTokenPaymentInput): Promise<AuthorizeCardTokenPaymentResult>;

    /**
     * Requests passkey enrollment options for card/token post-payment binding.
     */
    beginCardTokenEnrollment(input: BeginCardTokenEnrollmentInput): Promise<PublicKeyCredentialCreationOptionsJSON>;

    /**
     * Verifies passkey enrollment for card/token post-payment binding.
     */
    finishCardTokenEnrollment(input: FinishCardTokenEnrollmentInput): Promise<CardTokenEnrollmentResult>;
}

/**
 * Endpoint set used by fetch backend adapter.
 */
export interface PasskeyBackendEndpoints {
    beginRegistration: string;
    finishRegistration: string;
    beginAuthentication: string;
    finishAuthentication: string;
    beginPaymentStepUp: string;
    finishPaymentStepUp: string;
}

/**
 * Endpoint set used by fetch backend adapter for isolated card/token flow.
 */
export interface CardTokenPasskeyBackendEndpoints {
    beginCardTokenStepUp: string;
    finishCardTokenStepUp: string;
    authorizeCardTokenPayment: string;
    beginCardTokenEnrollment: string;
    finishCardTokenEnrollment: string;
}

/**
 * Configuration for a fetch-driven backend adapter.
 */
export interface FetchBackendAdapterConfig {
    baseUrl: string;
    endpoints?: Partial<PasskeyBackendEndpoints>;
    cardTokenEndpoints?: Partial<CardTokenPasskeyBackendEndpoints>;
    defaultHeaders?: HeadersInit;
    fetchImpl?: typeof fetch;
}

/**
 * Default endpoint paths expected by the fetch backend adapter.
 *
 * Exported so frontend/backend teams can share one visible source of truth.
 */
export const DEFAULT_PASSKEY_BACKEND_ENDPOINTS: Readonly<PasskeyBackendEndpoints> = {
    beginRegistration: '/passkeys/registration/options',
    finishRegistration: '/passkeys/registration/verify',
    beginAuthentication: '/passkeys/authentication/options',
    finishAuthentication: '/passkeys/authentication/verify',
    beginPaymentStepUp: '/passkeys/payments/options',
    finishPaymentStepUp: '/passkeys/payments/verify',
};

/**
 * Default endpoint paths for isolated card/token passkey flow.
 */
export const DEFAULT_CARD_TOKEN_PASSKEY_BACKEND_ENDPOINTS: Readonly<CardTokenPasskeyBackendEndpoints> = {
    beginCardTokenStepUp: '/passkeys/card-payments/options',
    finishCardTokenStepUp: '/passkeys/card-payments/verify',
    authorizeCardTokenPayment: '/passkeys/card-payments/authorize',
    beginCardTokenEnrollment: '/passkeys/card-payments/passkey/enroll/options',
    finishCardTokenEnrollment: '/passkeys/card-payments/passkey/enroll/verify',
};

/**
 * Creates a backend adapter that communicates with your API over `fetch`.
 */
export function createFetchBackendAdapter(config: FetchBackendAdapterConfig): PasskeyBackendAdapter & CardTokenPasskeyBackendAdapter {
    const endpoints: PasskeyBackendEndpoints = {
        ...DEFAULT_PASSKEY_BACKEND_ENDPOINTS,
        ...config.endpoints,
    };

    const cardTokenEndpoints: CardTokenPasskeyBackendEndpoints = {
        ...DEFAULT_CARD_TOKEN_PASSKEY_BACKEND_ENDPOINTS,
        ...config.cardTokenEndpoints,
    };

    const normalizedBaseUrl = config.baseUrl.replace(/\/+$/, '');

    return {
        beginRegistration: (input) => postJson<BeginRegistrationInput, PublicKeyCredentialCreationOptionsJSON>(normalizedBaseUrl, endpoints.beginRegistration, input, config),
        finishRegistration: (input) => postJson<FinishRegistrationInput, RegistrationVerificationResult>(normalizedBaseUrl, endpoints.finishRegistration, input, config),
        beginAuthentication: (input) => postJson<BeginAuthenticationInput, PublicKeyCredentialRequestOptionsJSON>(normalizedBaseUrl, endpoints.beginAuthentication, input, config),
        finishAuthentication: (input) => postJson<FinishAuthenticationInput, AuthenticationVerificationResult>(normalizedBaseUrl, endpoints.finishAuthentication, input, config),
        beginPaymentStepUp: (input) => postJson<BeginPaymentStepUpInput, PublicKeyCredentialRequestOptionsJSON>(normalizedBaseUrl, endpoints.beginPaymentStepUp, input, config),
        finishPaymentStepUp: (input) => postJson<FinishPaymentStepUpInput, PaymentStepUpVerificationResult>(normalizedBaseUrl, endpoints.finishPaymentStepUp, input, config),
        beginCardTokenStepUp: (input) => postJson<BeginCardTokenStepUpInput, PublicKeyCredentialRequestOptionsJSON>(normalizedBaseUrl, cardTokenEndpoints.beginCardTokenStepUp, input, config),
        finishCardTokenStepUp: (input) => postJson<FinishCardTokenStepUpInput, CardTokenStepUpVerificationResult>(normalizedBaseUrl, cardTokenEndpoints.finishCardTokenStepUp, input, config),
        authorizeCardTokenPayment: (input) => postJson<AuthorizeCardTokenPaymentInput, AuthorizeCardTokenPaymentResult>(normalizedBaseUrl, cardTokenEndpoints.authorizeCardTokenPayment, input, config),
        beginCardTokenEnrollment: (input) => postJson<BeginCardTokenEnrollmentInput, PublicKeyCredentialCreationOptionsJSON>(normalizedBaseUrl, cardTokenEndpoints.beginCardTokenEnrollment, input, config),
        finishCardTokenEnrollment: (input) => postJson<FinishCardTokenEnrollmentInput, CardTokenEnrollmentResult>(normalizedBaseUrl, cardTokenEndpoints.finishCardTokenEnrollment, input, config),
    };
}

/**
 * Sends a JSON POST request and parses the JSON response.
 */
async function postJson<TInput, TOutput>(baseUrl: string, endpoint: string, payload: TInput, config: FetchBackendAdapterConfig): Promise<TOutput> {
    const fetchImpl = config.fetchImpl ?? globalThis.fetch;
    if (!fetchImpl) {
        throw new BackendAdapterError('No fetch implementation is available for backend communication.');
    }

    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const response = await fetchImpl(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            ...config.defaultHeaders,
        },
        body: JSON.stringify(payload),
    });

    const responseBody = await parseJson(response);

    if (!response.ok) {
        throw new BackendAdapterError(`Backend request failed: ${response.status} ${response.statusText}`, {
            status: response.status,
            details: responseBody,
        });
    }

    return responseBody as TOutput;
}

/**
 * Parses JSON body when available.
 */
async function parseJson(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}
