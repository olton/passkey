# Passkey Backend API Contract

This document describes the minimal backend contract expected by the Passkey SDK client.

## How the SDK uses this contract

The SDK does not implement server verification internally. Your backend must expose this API.

Client method to endpoint mapping:

1. `passkey.register(...)`
- `POST /passkeys/registration/options`
- `POST /passkeys/registration/verify`
2. `passkey.login(...)` and `passkey.confirmSensitiveAction(...)`
- `POST /passkeys/authentication/options`
- `POST /passkeys/authentication/verify`
3. `passkey.confirmPayment(...)`
- `POST /passkeys/payments/options`
- `POST /passkeys/payments/verify`

Demo servers in this repository are examples of this contract, not a required backend runtime.

## Base conventions

- Transport: HTTPS JSON API.
- Method: `POST` for all endpoints.
- Content type: `application/json`.
- Challenge IDs must be one-time and short-lived.

## 1) Begin registration

- Endpoint: `POST /passkeys/registration/options`

### Request

```json
{
  "user": {
    "id": "user_1001",
    "username": "demo@example.com",
    "displayName": "Demo User"
  },
  "riskSignals": {
    "ipAddress": "203.0.113.5",
    "trustedDevice": true
  },
  "context": {
    "source": "web-client"
  }
}
```

Field notes:

- `user.id`: internal stable user identifier in your system.
- `user.username`: login identifier (email/phone/username) used to find user credentials.
- `user.displayName`: human-readable name shown by authenticator UX.
- `riskSignals`: optional backend risk context to tune policy decisions.
- `context`: optional metadata for logging/routing/business rules.

### Response

```json
{
  "challenge": "x2JQ4x7...",
  "challengeId": "0c54f05a-0af8-4e77-9a2b-83926457dd1f",
  "rp": { "id": "example.com", "name": "Example" },
  "user": {
    "id": "dXNlcl8xMDAx",
    "name": "demo@example.com",
    "displayName": "Demo User"
  },
  "pubKeyCredParams": [
    { "type": "public-key", "alg": -7 },
    { "type": "public-key", "alg": -257 }
  ],
  "timeout": 60000,
  "attestation": "none",
  "authenticatorSelection": {
    "residentKey": "preferred",
    "userVerification": "preferred"
  }
}
```

Field notes:

- `challenge`: random one-time value that must be signed by authenticator.
- `challengeId`: backend-side challenge reference used during verify step.
- `rp`: relying party identity (must match your production domain policy).
- `user.id`: base64url-encoded binary user handle for WebAuthn.
- `pubKeyCredParams`: accepted cryptographic algorithms.
- `timeout`: ceremony timeout hint (milliseconds).
- `attestation`: attestation conveyance preference (`none` in most consumer scenarios).
- `authenticatorSelection`: authenticator policy (`residentKey`, `userVerification`, etc.).

## 2) Finish registration

- Endpoint: `POST /passkeys/registration/verify`

### Request

```json
{
  "userId": "user_1001",
  "challengeId": "0c54f05a-0af8-4e77-9a2b-83926457dd1f",
  "credential": {
    "id": "credential-id",
    "rawId": "c29tZS1yYXctaWQ",
    "type": "public-key",
    "response": {
      "clientDataJSON": "...",
      "attestationObject": "...",
      "transports": ["internal"]
    },
    "clientExtensionResults": {}
  }
}
```

Field notes:

- `userId`: your backend user ID that is being bound to new credential.
- `challengeId`: reference to the challenge returned by registration options.
- `credential`: serialized browser registration result (`navigator.credentials.create`).
- `credential.response.clientDataJSON`: signed client metadata (origin, challenge, type).
- `credential.response.attestationObject`: attestation payload with credential public key data.
- `credential.response.transports`: optional authenticator transport hints.
- `clientExtensionResults`: extension outputs from browser WebAuthn API.

### Response

```json
{
  "verified": true,
  "credentialId": "credential-id",
  "session": {
    "userId": "user_1001",
    "sessionId": "sess_001",
    "accessToken": "jwt-or-opaque-token",
    "refreshToken": "optional-refresh-token",
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "amr": ["passkey"]
  }
}
```

Field notes:

- `verified`: final backend verification result for registration.
- `credentialId`: stored credential identifier for later assertions.
- `session`: optional immediate authenticated session after successful registration.
- `session.amr`: authentication method reference (here includes `passkey`).

## 3) Begin authentication

- Endpoint: `POST /passkeys/authentication/options`

### Request

```json
{
  "username": "demo@example.com",
  "purpose": "login",
  "riskSignals": {
    "trustedDevice": true
  }
}
```

Field notes:

- `username`: identifier used to resolve user/passkey set.
- `purpose`: authentication intent (`login`, `sensitive-action`, etc.).
- `riskSignals`: optional signals that can raise assurance requirements.

### Response

```json
{
  "challenge": "8f7X...",
  "challengeId": "3aa96e2c-d8fb-4c26-80af-9810fbe0df26",
  "rpId": "example.com",
  "userVerification": "preferred",
  "timeout": 60000
}
```

Field notes:

- `challenge`: one-time assertion challenge.
- `challengeId`: backend reference for challenge lookup and one-time validation.
- `rpId`: relying party ID expected by authenticator.
- `userVerification`: desired user verification level for assertion ceremony.
- `timeout`: assertion timeout hint (milliseconds).

## 4) Finish authentication

- Endpoint: `POST /passkeys/authentication/verify`

### Request

```json
{
  "challengeId": "3aa96e2c-d8fb-4c26-80af-9810fbe0df26",
  "purpose": "login",
  "credential": {
    "id": "credential-id",
    "rawId": "...",
    "type": "public-key",
    "response": {
      "clientDataJSON": "...",
      "authenticatorData": "...",
      "signature": "...",
      "userHandle": "..."
    },
    "clientExtensionResults": {}
  }
}
```

Field notes:

- `challengeId`: must match the value from authentication options response.
- `purpose`: must match the intended flow to prevent cross-flow replay.
- `credential`: serialized browser authentication result (`navigator.credentials.get`).
- `response.authenticatorData`: authenticator state and flags.
- `response.signature`: signature over challenge/client data used for verification.
- `response.userHandle`: optional user handle provided by authenticator.

### Response

```json
{
  "verified": true,
  "levelOfAssurance": "high",
  "session": {
    "userId": "user_1001",
    "sessionId": "sess_002",
    "accessToken": "jwt-or-opaque-token",
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "amr": ["passkey"]
  }
}
```

Field notes:

- `verified`: final backend assertion verification status.
- `levelOfAssurance`: your backend risk/assurance classification.
- `session`: authenticated session/token set for app authorization.

## 5) Begin payment step-up

- Endpoint: `POST /passkeys/payments/options`

### Request

```json
{
  "payment": {
    "paymentIntentId": "pi_01",
    "amountMinor": 45000,
    "currency": "UAH",
    "merchantId": "merchant_demo",
    "accountId": "click2pay_account_42"
  },
  "userId": "user_1001",
  "riskSignals": {
    "trustedDevice": true
  }
}
```

Field notes:

- `payment`: payment intent context that must be bound to challenge.
- `payment.paymentIntentId`: unique payment operation ID in your PSP/core.
- `amountMinor`: amount in minor units (for example cents).
- `currency`: ISO currency code.
- `merchantId`: merchant/account identifier for policy checks.
- `accountId`: optional payment account identifier (for example Mastercard Click to Pay profile).
- `userId`: user who attempts payment confirmation.
- `riskSignals`: optional risk context for fallback/step-up decisions.

Model note:

- Passkey is enrolled once for the payment account (typically after account OTP/identity verification) and reused for subsequent payments across all cards in that account.

### Response

```json
{
  "challenge": "_dQee...",
  "challengeId": "f76f13d4-1d26-486a-a165-693c3af4b53d",
  "rpId": "example.com",
  "userVerification": "required",
  "timeout": 60000
}
```

Field notes:

- `challenge`: one-time challenge specific to payment step-up ceremony.
- `challengeId`: backend reference that must be consumed once in verify step.
- `rpId`: relying party ID used by authenticator.
- `userVerification`: often `required` for payment-grade assurance.
- `timeout`: ceremony timeout hint (milliseconds).

## 6) Finish payment step-up

- Endpoint: `POST /passkeys/payments/verify`

### Request

```json
{
  "challengeId": "f76f13d4-1d26-486a-a165-693c3af4b53d",
  "payment": {
    "paymentIntentId": "pi_01",
    "amountMinor": 45000,
    "currency": "UAH",
    "merchantId": "merchant_demo"
  },
  "credential": {
    "id": "credential-id",
    "rawId": "...",
    "type": "public-key",
    "response": {
      "clientDataJSON": "...",
      "authenticatorData": "...",
      "signature": "...",
      "userHandle": "..."
    },
    "clientExtensionResults": {}
  }
}
```

Field notes:

- `challengeId`: value returned by payment options endpoint.
- `payment`: must match the original payment intent to prevent replay/substitution.
- `credential`: serialized assertion from `navigator.credentials.get`.
- `response.signature`: cryptographic proof used for final payment decision.

### Response

```json
{
  "decision": "approved",
  "code": "approved",
  "challengeId": "f76f13d4-1d26-486a-a165-693c3af4b53d",
  "authValue": "AAVV...",
  "eci": "05",
  "message": "Payment approved with passkey step-up."
}
```

Field notes:

- `decision`: final backend decision (`approved`, `fallback_to_3ds`, `rejected`, `enrollment_required`).
- `code`: optional machine-readable branch code for frontend flows.
- `challengeId`: echoed challenge reference for traceability/audit.
- `authValue`: optional payment authentication value for downstream rails.
- `eci`: optional e-commerce indicator for card processing.
- `message`: human-readable outcome explanation.

Possible values for `decision`:

- `approved`
- `fallback_to_3ds`
- `rejected`
- `enrollment_required`

## Backend validation checklist

- Validate origin and RP ID.
- Validate challenge binding and one-time use.
- Verify WebAuthn signatures and counters.
- Bind result to payment/auth intent to prevent replay across flows.
- Enforce risk policies for fallback to 3DS where required.

## Typical backend errors

Use one stable JSON error shape across all passkey endpoints.

### Standard error response shape

```json
{
  "error": {
    "code": "challenge_expired",
    "message": "Challenge has expired. Request new options.",
    "retryable": true,
    "details": {
      "challengeId": "3aa96e2c-d8fb-4c26-80af-9810fbe0df26"
    }
  }
}
```

Field notes:

- `error.code`: machine-readable stable identifier used by client logic.
- `error.message`: human-readable text for logs and optional UI fallback.
- `error.retryable`: indicates whether client can retry same action flow.
- `error.details`: optional structured context for debugging/analytics.

### Recommended HTTP status and error codes

| HTTP | Code | Meaning | Typical client action |
|---|---|---|---|
| 400 | `invalid_request` | Missing/invalid fields or malformed payload | Fix payload before retry |
| 401 | `not_authenticated` | User/session is not authenticated where required | Re-authenticate user |
| 403 | `origin_mismatch` | Request origin does not match allowed RP origin | Block flow, investigate config |
| 403 | `rp_id_mismatch` | RP ID does not match backend policy | Block flow, fix RP config |
| 404 | `user_not_found` | Username/userId not found | Ask user to re-check account |
| 404 | `credential_not_found` | No matching credential for assertion | Offer re-registration |
| 404 | `challenge_not_found` | Challenge reference does not exist | Restart flow from options endpoint |
| 409 | `credential_already_registered` | Credential already linked to account | Treat as idempotent success or show info |
| 409 | `challenge_already_used` | Challenge replay attempt detected | Restart flow from options endpoint |
| 410 | `challenge_expired` | Challenge exists but TTL elapsed | Restart flow from options endpoint |
| 422 | `assertion_invalid` | Signature/counter/clientData verification failed | Ask user to retry passkey |
| 422 | `purpose_mismatch` | Verify step purpose does not match issued challenge | Restart flow and preserve purpose |
| 422 | `payment_context_mismatch` | Payment data at verify differs from begin step | Abort payment and re-initiate |
| 429 | `rate_limited` | Too many attempts in short period | Backoff and retry later |
| 500 | `internal_error` | Unexpected backend failure | Retry later and alert monitoring |

### Flow-specific error examples

1. `POST /passkeys/registration/options`
- `400 invalid_request`
- `404 user_not_found`
- `429 rate_limited`

2. `POST /passkeys/registration/verify`
- `404 challenge_not_found`
- `410 challenge_expired`
- `409 challenge_already_used`
- `422 assertion_invalid`
- `409 credential_already_registered`

3. `POST /passkeys/authentication/options`
- `404 user_not_found`
- `429 rate_limited`

4. `POST /passkeys/authentication/verify`
- `404 challenge_not_found`
- `410 challenge_expired`
- `422 assertion_invalid`
- `422 purpose_mismatch`

5. `POST /passkeys/payments/options`
- `401 not_authenticated`
- `422 payment_context_mismatch`
- `429 rate_limited`

6. `POST /passkeys/payments/verify`
- `404 challenge_not_found`
- `410 challenge_expired`
- `422 assertion_invalid`
- `422 payment_context_mismatch`

### Client handling recommendations

1. Use `error.code` as primary branch key in UI/business logic.
2. Treat `challenge_expired` and `challenge_already_used` as restart-required.
3. Do not expose low-level verification internals in user-facing messages.
4. Log `error.code` and `error.details` for support and fraud analytics.

## Error codes that should trigger immediate passkey re-registration

This section defines high-risk errors where retry is not enough and passkey re-enrollment should start immediately.

### Recommended critical codes

| Code | Why it is critical | Immediate action |
|---|---|---|
| `credential_revoked` | Credential was explicitly revoked or disabled server-side | Start re-registration and block old credential usage |
| `credential_not_found` | Assertion references unknown credential (for previously enrolled user) | Start re-registration and alert support telemetry |
| `sign_count_regression` | Counter rollback can indicate cloned authenticator or replay risk | Force re-registration and mark session as high risk |
| `cloned_authenticator_detected` | Backend detected authenticator cloning signals | Block sensitive operations and require new passkey |
| `credential_compromised` | Credential appears in internal compromise/security event flow | Immediately revoke and require fresh enrollment |

### Optional response shape extension for these cases

```json
{
  "error": {
    "code": "sign_count_regression",
    "message": "Authenticator counter decreased. Re-registration is required.",
    "retryable": false,
    "requiresReRegistration": true,
    "details": {
      "userId": "user_1001"
    }
  }
}
```

Field notes:

- `requiresReRegistration`: explicit backend flag for deterministic frontend branching.
- `retryable: false`: indicates retries should not continue current credential flow.

### Mandatory client behavior

1. Stop automatic retries for current credential.
2. Show recovery UI: "Your passkey must be re-registered to continue."
3. Start registration flow from `POST /passkeys/registration/options`.
4. Keep user in restricted mode until re-registration succeeds.

### Mandatory backend behavior

1. Invalidate active challenge/session used in failed verification flow.
2. Revoke affected credential ID from active allow-list.
3. Emit security event with `error.code`, `userId`, and device metadata.
4. Require step-up or additional verification before any high-risk operation.

### Support and antifraud runbook hints

1. Support should verify account ownership before assisting with recovery.
2. Antifraud should prioritize `sign_count_regression` and `cloned_authenticator_detected` as potential account takeover indicators.
3. Repeated critical errors for one account should trigger manual review queue.
4. Keep audit trail linking revoked credential, new credential, and incident ticket ID.
