import { describe, expect, it } from "vitest";
import {
  BackendAdapterError,
  PasskeyError,
  PasskeyNotSupportedError,
  UserCancelledError,
} from "../../src/errors";

describe("errors module", () => {
  it("creates domain-specific errors with expected names", () => {
    const baseError = new PasskeyError("base");
    const unsupported = new PasskeyNotSupportedError();
    const cancelled = new UserCancelledError();

    expect(baseError.name).toBe("PasskeyError");
    expect(unsupported.name).toBe("PasskeyNotSupportedError");
    expect(cancelled.name).toBe("UserCancelledError");
    expect(unsupported).toBeInstanceOf(PasskeyError);
    expect(cancelled).toBeInstanceOf(PasskeyError);
  });

  it("stores backend status and details", () => {
    const error = new BackendAdapterError("backend failed", {
      status: 401,
      details: {
        code: "UNAUTHORIZED",
      },
    });

    expect(error.name).toBe("BackendAdapterError");
    expect(error.status).toBe(401);
    expect(error.details).toEqual({ code: "UNAUTHORIZED" });
  });
});
