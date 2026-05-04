/**
 * Base error type for all passkey SDK failures.
 */
export class PasskeyError extends Error {
  /**
   * Creates a new passkey error.
   */
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PasskeyError";
  }
}

/**
 * Error thrown when the current browser does not support WebAuthn APIs.
 */
export class PasskeyNotSupportedError extends PasskeyError {
  /**
   * Creates a new feature-support error.
   */
  constructor(message = "This browser does not support passkeys.") {
    super(message);
    this.name = "PasskeyNotSupportedError";
  }
}

/**
 * Error thrown when a user closes or cancels biometric/passkey prompt.
 */
export class UserCancelledError extends PasskeyError {
  /**
   * Creates a new cancellation error.
   */
  constructor(message = "Passkey ceremony was cancelled by the user.") {
    super(message);
    this.name = "UserCancelledError";
  }
}

/**
 * Error for backend adapter request and response failures.
 */
export class BackendAdapterError extends PasskeyError {
  status: number | undefined;
  details: unknown;

  /**
   * Creates a new backend adapter error.
   */
  constructor(
    message: string,
    options?: ErrorOptions & { status?: number; details?: unknown },
  ) {
    super(message, options);
    this.name = "BackendAdapterError";
    this.status = options?.status;
    this.details = options?.details;
  }
}