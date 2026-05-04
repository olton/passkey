import {
  arrayBufferToBase64Url,
  base64UrlToArrayBuffer,
} from "../utils/base64url";
import {
  PasskeyNotSupportedError,
  UserCancelledError,
} from "../errors";
import type {
  CredentialAssertionJSON,
  CredentialAttestationJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialDescriptorJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "../types";

/**
 * WebAuthn transport service for browser passkey ceremonies.
 */
export class WebAuthnService {
  /**
   * Returns `true` when browser runtime supports WebAuthn APIs.
   */
  public isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      typeof PublicKeyCredential !== "undefined" &&
      Boolean(navigator.credentials)
    );
  }

  /**
   * Executes passkey registration ceremony and serializes credential output.
   */
  public async createCredential(
    options: PublicKeyCredentialCreationOptionsJSON,
  ): Promise<CredentialAttestationJSON> {
    this.ensureSupported();

    const publicKey = mapCreationOptions(options);

    try {
      const credential = await navigator.credentials.create({ publicKey });
      if (!(credential instanceof PublicKeyCredential)) {
        throw new Error("WebAuthn registration did not return PublicKeyCredential.");
      }

      return serializeAttestation(credential);
    } catch (error) {
      throw mapWebAuthnError(error);
    }
  }

  /**
   * Executes passkey assertion ceremony and serializes credential output.
   */
  public async getAssertion(
    options: PublicKeyCredentialRequestOptionsJSON,
  ): Promise<CredentialAssertionJSON> {
    this.ensureSupported();

    const publicKey = mapRequestOptions(options);

    try {
      const credential = await navigator.credentials.get({ publicKey });
      if (!(credential instanceof PublicKeyCredential)) {
        throw new Error(
          "WebAuthn authentication did not return PublicKeyCredential.",
        );
      }

      return serializeAssertion(credential);
    } catch (error) {
      throw mapWebAuthnError(error);
    }
  }

  /**
   * Guards runtime support before passkey ceremonies.
   */
  private ensureSupported(): void {
    if (!this.isSupported()) {
      throw new PasskeyNotSupportedError();
    }
  }
}

/**
 * Converts registration options from JSON into native browser format.
 */
function mapCreationOptions(
  options: PublicKeyCredentialCreationOptionsJSON,
): PublicKeyCredentialCreationOptions {
  const mapped: PublicKeyCredentialCreationOptions = {
    challenge: base64UrlToArrayBuffer(options.challenge),
    rp: options.rp,
    user: {
      ...options.user,
      id: base64UrlToArrayBuffer(options.user.id),
    },
    pubKeyCredParams: options.pubKeyCredParams,
    ...(options.timeout ? { timeout: options.timeout } : {}),
    ...(options.authenticatorSelection
      ? { authenticatorSelection: options.authenticatorSelection }
      : {}),
    ...(options.attestation ? { attestation: options.attestation } : {}),
    ...(options.extensions ? { extensions: options.extensions } : {}),
  };

  if (options.excludeCredentials && options.excludeCredentials.length > 0) {
    mapped.excludeCredentials = options.excludeCredentials.map(mapCredentialDescriptor);
  }

  return mapped;
}

/**
 * Converts assertion options from JSON into native browser format.
 */
function mapRequestOptions(
  options: PublicKeyCredentialRequestOptionsJSON,
): PublicKeyCredentialRequestOptions {
  const mapped: PublicKeyCredentialRequestOptions = {
    challenge: base64UrlToArrayBuffer(options.challenge),
    ...(options.timeout ? { timeout: options.timeout } : {}),
    ...(options.rpId ? { rpId: options.rpId } : {}),
    ...(options.userVerification
      ? { userVerification: options.userVerification }
      : {}),
    ...(options.extensions ? { extensions: options.extensions } : {}),
  };

  if (options.allowCredentials && options.allowCredentials.length > 0) {
    mapped.allowCredentials = options.allowCredentials.map(mapCredentialDescriptor);
  }

  return mapped;
}

/**
 * Maps JSON credential descriptor into browser descriptor.
 */
function mapCredentialDescriptor(
  descriptor: PublicKeyCredentialDescriptorJSON,
): PublicKeyCredentialDescriptor {
  return {
    ...descriptor,
    id: base64UrlToArrayBuffer(descriptor.id),
  };
}

/**
 * Serializes attestation credential into JSON-safe payload.
 */
function serializeAttestation(
  credential: PublicKeyCredential,
): CredentialAttestationJSON {
  const response = credential.response as AuthenticatorAttestationResponse;
  const transports =
    typeof response.getTransports === "function"
      ? (response.getTransports() as AuthenticatorTransport[])
      : undefined;

  const serializedResponse: CredentialAttestationJSON["response"] = {
    clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
    attestationObject: arrayBufferToBase64Url(response.attestationObject),
    ...(transports ? { transports } : {}),
  };

  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    type: credential.type as PublicKeyCredentialType,
    response: serializedResponse,
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}

/**
 * Serializes assertion credential into JSON-safe payload.
 */
function serializeAssertion(
  credential: PublicKeyCredential,
): CredentialAssertionJSON {
  const response = credential.response as AuthenticatorAssertionResponse;

  const serializedResponse: CredentialAssertionJSON["response"] = {
    clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
    authenticatorData: arrayBufferToBase64Url(response.authenticatorData),
    signature: arrayBufferToBase64Url(response.signature),
    ...(response.userHandle
      ? { userHandle: arrayBufferToBase64Url(response.userHandle) }
      : {}),
  };

  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    type: credential.type as PublicKeyCredentialType,
    response: serializedResponse,
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}

/**
 * Maps native WebAuthn errors into SDK-level domain errors.
 */
function mapWebAuthnError(error: unknown): Error {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return new UserCancelledError();
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Unknown WebAuthn error.");
}