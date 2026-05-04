import { describe, expect, it, vi } from "vitest";
import { createFetchBackendAdapter } from "../../src/adapters";
import { BackendAdapterError } from "../../src/errors";

describe("backend adapter", () => {
  it("calls beginAuthentication endpoint with JSON payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          challenge: "abc",
          challengeId: "ch_1",
          rpId: "localhost",
        }),
        { status: 200 },
      ),
    );

    const adapter = createFetchBackendAdapter({
      baseUrl: "https://api.example.com/",
      defaultHeaders: {
        "x-test": "1",
      },
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const result = await adapter.beginAuthentication({
      username: "demo@example.com",
      purpose: "login",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/passkeys/authentication/options",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(result.challengeId).toBe("ch_1");
  });

  it("throws BackendAdapterError on non-success response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid" }), {
        status: 400,
        statusText: "Bad Request",
      }),
    );

    const adapter = createFetchBackendAdapter({
      baseUrl: "https://api.example.com",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    try {
      await adapter.beginAuthentication({ username: "demo@example.com" });
      throw new Error("Expected beginAuthentication to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(BackendAdapterError);
      expect(error).toMatchObject({ status: 400, details: { error: "invalid" } });
    }
  });
});
