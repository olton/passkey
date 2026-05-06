import { afterEach, describe, expect, it, vi } from "vitest";
import { decrypt, encrypt } from "../../src/crypto";

type DeviceRiskPayload = {
  userId: string;
  trustedDevice: boolean;
  score: number;
  tags: string[];
};

const samplePayload: DeviceRiskPayload = {
  userId: "user_42",
  trustedDevice: true,
  score: 0.12,
  tags: ["known-ip", "fresh-session"],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generic payload crypto", () => {
  const hasWebCrypto = Boolean(
    globalThis.crypto?.subtle && typeof globalThis.crypto.getRandomValues === "function",
  );

  const itIfWebCrypto = hasWebCrypto ? it : it.skip;

  itIfWebCrypto("encrypts and decrypts arbitrary payload via generics", async () => {
    const encrypted = await encrypt<DeviceRiskPayload>(samplePayload);

    expect(encrypted).toEqual(expect.any(String));
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = await decrypt<DeviceRiskPayload>(encrypted);
    expect(decrypted).toEqual(samplePayload);
  });

  it("throws when Web Crypto API is unavailable", async () => {
    vi.stubGlobal("crypto", {} as Crypto);

    await expect(encrypt(samplePayload)).rejects.toThrow(
      "Web Crypto API is not available in this browser.",
    );
  });
});
