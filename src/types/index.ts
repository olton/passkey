/**
 * Base64 URL-safe string used by WebAuthn JSON payloads.
 */
export type Base64Url = string;

/**
 * Decision returned after passkey-based payment step-up verification.
 */
export enum StepUpDecision {
  Approved = "approved",
  FallbackTo3DS = "fallback_to_3ds",
  Rejected = "rejected",
  EnrollmentRequired = "enrollment_required",
}

/**
 * Common web-client scenarios where passkeys can replace passwords or 3DS.
 */
export type WebClientScenario =
  | "login"
  | "payment-step-up"
  | "payment-card-token-step-up"
  | "sensitive-action"
  | "passwordless-recovery";

/**
 * Metadata about the user in your domain.
 */
export interface PasskeyUser {
  id: string;
  username: string;
  displayName: string;
  tenantId?: string;
}

/**
 * Optional risk signals that can be used by backend fraud engines.
 */
export interface RiskSignals {
  ipAddress?: string;
  deviceId?: string;
  userAgent?: string;
  geolocation?: string;
  trustedDevice?: boolean;
}

/**
 * Business context for payment authentication using an account-level passkey.
 */
export interface PaymentContext {
  paymentIntentId: string;
  amountMinor: number;
  currency: string;
  merchantId: string;
  accountId?: string;
  orderId?: string;
  cardFingerprint?: string;
  acquirerReference?: string;
}

/**
 * @deprecated Use `PaymentContext` instead. Kept for backward compatibility.
 */
export type CardPaymentContext = PaymentContext;

/**
 * Supported payment instrument types for card/token checkout flow.
 */
export type PaymentInstrumentType = "card" | "token";

/**
 * Payment instrument reference used by isolated card/token passkey flow.
 */
export interface PaymentInstrumentRef {
  type: PaymentInstrumentType;
  cardFingerprint?: string;
  tokenId?: string;
}

/**
 * JSON representation of a WebAuthn credential descriptor.
 */
export interface PublicKeyCredentialDescriptorJSON {
  id: Base64Url;
  type: PublicKeyCredentialType;
  transports?: AuthenticatorTransport[];
}

/**
 * JSON representation of WebAuthn user entity where `id` is base64url encoded.
 */
export interface PublicKeyCredentialUserEntityJSON
  extends Omit<PublicKeyCredentialUserEntity, "id"> {
  id: Base64Url;
}

/**
 * JSON representation of WebAuthn registration options from backend.
 */
export interface PublicKeyCredentialCreationOptionsJSON {
  challenge: Base64Url;
  rp: PublicKeyCredentialRpEntity;
  user: PublicKeyCredentialUserEntityJSON;
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  excludeCredentials?: PublicKeyCredentialDescriptorJSON[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  attestation?: AttestationConveyancePreference;
  extensions?: AuthenticationExtensionsClientInputs;
  challengeId?: string;
}

/**
 * JSON representation of WebAuthn authentication options from backend.
 */
export interface PublicKeyCredentialRequestOptionsJSON {
  challenge: Base64Url;
  timeout?: number;
  rpId?: string;
  allowCredentials?: PublicKeyCredentialDescriptorJSON[];
  userVerification?: UserVerificationRequirement;
  hints?: string[];
  extensions?: AuthenticationExtensionsClientInputs;
  challengeId?: string;
}

/**
 * Serialized attestation result that can be sent to backend APIs.
 */
export interface CredentialAttestationJSON {
  id: string;
  rawId: Base64Url;
  type: PublicKeyCredentialType;
  response: {
    clientDataJSON: Base64Url;
    attestationObject: Base64Url;
    transports?: AuthenticatorTransport[];
  };
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
}

/**
 * Serialized assertion result that can be sent to backend APIs.
 */
export interface CredentialAssertionJSON {
  id: string;
  rawId: Base64Url;
  type: PublicKeyCredentialType;
  response: {
    clientDataJSON: Base64Url;
    authenticatorData: Base64Url;
    signature: Base64Url;
    userHandle?: Base64Url;
  };
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
}

/**
 * Input for registration challenge request.
 */
export interface BeginRegistrationInput {
  user: PasskeyUser;
  context?: Record<string, unknown>;
  riskSignals?: RiskSignals;
}

/**
 * Input for registration verification request.
 */
export interface FinishRegistrationInput {
  userId: string;
  credential: CredentialAttestationJSON;
  challengeId?: string;
  context?: Record<string, unknown>;
}

/**
 * Input for authentication challenge request.
 */
export interface BeginAuthenticationInput {
  userId?: string;
  username?: string;
  purpose?: Exclude<WebClientScenario, "payment-step-up">;
  context?: Record<string, unknown>;
  riskSignals?: RiskSignals;
}

/**
 * Input for authentication verification request.
 */
export interface FinishAuthenticationInput {
  credential: CredentialAssertionJSON;
  challengeId?: string;
  purpose?: Exclude<WebClientScenario, "payment-step-up">;
  context?: Record<string, unknown>;
}

/**
 * Input for payment challenge request.
 */
export interface BeginPaymentStepUpInput {
  payment: PaymentContext;
  userId?: string;
  context?: Record<string, unknown>;
  riskSignals?: RiskSignals;
}

/**
 * Input for payment step-up verification request.
 */
export interface FinishPaymentStepUpInput {
  payment: PaymentContext;
  credential: CredentialAssertionJSON;
  challengeId?: string;
  context?: Record<string, unknown>;
}

/**
 * Decision returned after card/token step-up verification.
 */
export enum CardTokenAuthDecision {
  Approved = "approved",
  FallbackTo3DS = "fallback_to_3ds",
  Rejected = "rejected",
  Timeout = "timeout",
  Cancelled = "cancelled",
  NotSupported = "not_supported",
  Error = "error",
}

/**
 * Final payment authorization status returned by PSP/acquirer path.
 */
export enum CardTokenGatewayStatus {
  Success = "success",
  Declined = "declined",
  DeclinedFraud = "declined_fraud",
  Error = "error",
}

/**
 * Post-payment enrollment action outcome for card/token passkey binding.
 */
export enum CardTokenEnrollmentOutcome {
  Bound = "bound",
  SkippedByUser = "skipped_by_user",
  Failed = "failed",
}

/**
 * Input for isolated card/token step-up options request.
 */
export interface BeginCardTokenStepUpInput {
  payment: PaymentContext;
  instrument: PaymentInstrumentRef;
  userId?: string;
  context?: Record<string, unknown>;
  riskSignals?: RiskSignals;
}

/**
 * Input for isolated card/token step-up verification request.
 */
export interface FinishCardTokenStepUpInput {
  payment: PaymentContext;
  instrument: PaymentInstrumentRef;
  credential: CredentialAssertionJSON;
  challengeId?: string;
  context?: Record<string, unknown>;
}

/**
 * Step-up verification response for isolated card/token flow.
 */
export interface CardTokenStepUpVerificationResult {
  authDecision: CardTokenAuthDecision;
  code?: string;
  challengeId?: string;
  message?: string;
}

/**
 * Input for final payment authorization after successful step-up.
 */
export interface AuthorizeCardTokenPaymentInput {
  payment: PaymentContext;
  instrument: PaymentInstrumentRef;
  challengeId?: string;
  context?: Record<string, unknown>;
}

/**
 * Final authorization response for isolated card/token payment flow.
 */
export interface AuthorizeCardTokenPaymentResult {
  gatewayStatus: CardTokenGatewayStatus;
  code?: string;
  reason?: string;
  message?: string;
}

/**
 * Input for card/token post-payment passkey enrollment request.
 */
export interface BeginCardTokenEnrollmentInput {
  payment: PaymentContext;
  instrument: PaymentInstrumentRef;
  user: PasskeyUser;
  context?: Record<string, unknown>;
  riskSignals?: RiskSignals;
}

/**
 * Input for card/token post-payment passkey enrollment verification.
 */
export interface FinishCardTokenEnrollmentInput {
  payment: PaymentContext;
  instrument: PaymentInstrumentRef;
  userId: string;
  credential: CredentialAttestationJSON;
  challengeId?: string;
  context?: Record<string, unknown>;
}

/**
 * Result of post-payment passkey enrollment for card/token flow.
 */
export interface CardTokenEnrollmentResult {
  outcome: CardTokenEnrollmentOutcome;
  code?: string;
  message?: string;
}

/**
 * Input of isolated card/token checkout confirmation.
 */
export interface ConfirmCardTokenCheckoutInput {
  payment: PaymentContext;
  instrument: PaymentInstrumentRef;
  userId?: string;
  context?: Record<string, unknown>;
  riskSignals?: RiskSignals;
  passkeyAlreadyBound?: boolean;
}

/**
 * Result of isolated card/token checkout orchestration.
 */
export interface CardTokenCheckoutResult {
  authDecision: CardTokenAuthDecision;
  gatewayStatus?: CardTokenGatewayStatus;
  usedPasskey: boolean;
  shouldOfferEnrollment: boolean;
  code?: string;
  message?: string;
}

/**
 * Session payload returned after successful passkey auth.
 */
export interface AuthSession {
  userId: string;
  sessionId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  amr?: string[];
}

/**
 * Verification response for passkey registration.
 */
export interface RegistrationVerificationResult {
  verified: boolean;
  credentialId?: string;
  session?: AuthSession;
  message?: string;
}

/**
 * Verification response for passkey authentication.
 */
export interface AuthenticationVerificationResult {
  verified: boolean;
  session?: AuthSession;
  levelOfAssurance?: string;
  message?: string;
}

/**
 * Verification response for payment step-up.
 */
export interface PaymentStepUpVerificationResult {
  decision: StepUpDecision;
  code?: string;
  challengeId?: string;
  authValue?: string;
  eci?: string;
  message?: string;
}

/**
 * Final client result of payment step-up flow.
 */
export interface PaymentStepUpResult extends PaymentStepUpVerificationResult {
  usedPasskey: boolean;
}