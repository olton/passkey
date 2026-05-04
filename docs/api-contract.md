# Passkey Backend API Contract

This document describes the minimal backend contract expected by the Passkey SDK client.

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

## 5) Begin payment step-up

- Endpoint: `POST /passkeys/payments/options`

### Request

```json
{
  "payment": {
    "paymentIntentId": "pi_01",
    "amountMinor": 45000,
    "currency": "UAH",
    "merchantId": "merchant_demo"
  },
  "userId": "user_1001",
  "riskSignals": {
    "trustedDevice": true
  }
}
```

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

### Response

```json
{
  "decision": "approved",
  "challengeId": "f76f13d4-1d26-486a-a165-693c3af4b53d",
  "authValue": "AAVV...",
  "eci": "05",
  "message": "Payment approved with passkey step-up."
}
```

Possible values for `decision`:

- `approved`
- `fallback_to_3ds`
- `rejected`

## Backend validation checklist

- Validate origin and RP ID.
- Validate challenge binding and one-time use.
- Verify WebAuthn signatures and counters.
- Bind result to payment/auth intent to prevent replay across flows.
- Enforce risk policies for fallback to 3DS where required.
