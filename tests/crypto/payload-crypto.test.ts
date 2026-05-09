import { afterEach, describe, expect, it, vi } from "vitest";
import { decrypt, encrypt, encryptWithServerKey } from "../../src/crypto";
import { arrayBufferToBase64Url, base64UrlToArrayBuffer } from "../../src/utils";

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

  itIfWebCrypto("encrypts with server public key and decrypts with private key", async () => {
    const keyPair = (await globalThis.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
    )) as CryptoKeyPair;

    const publicKeySpki = await globalThis.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const privateKeyPkcs8 = await globalThis.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    const encrypted = await encryptWithServerKey<DeviceRiskPayload>(samplePayload, {
      serverKeyEncryption: {
        publicKeySpki: arrayBufferToBase64Url(publicKeySpki),
        keyId: "demo-key-1",
      },
    });

    const bundle = JSON.parse(
      new TextDecoder().decode(base64UrlToArrayBuffer(encrypted)),
    ) as Record<string, unknown>;

    expect(bundle["encryptedKeyMaterial"]).toEqual(expect.any(String));
    expect(bundle["keyMaterial"]).toBeUndefined();
    expect(bundle["keyWrappingAlgorithm"]).toBe("RSA-OAEP");
    expect(bundle["keyWrappingKeyId"]).toBe("demo-key-1");

    const decrypted = await decrypt<DeviceRiskPayload>(encrypted, {
      serverKeyDecryption: {
        privateKeyPkcs8: arrayBufferToBase64Url(privateKeyPkcs8),
      },
    });

    expect(decrypted).toEqual(samplePayload);
  });

  itIfWebCrypto("fails to decrypt wrapped key bundle without server private key", async () => {
    const keyPair = (await globalThis.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
    )) as CryptoKeyPair;

    const publicKeySpki = await globalThis.crypto.subtle.exportKey("spki", keyPair.publicKey);

    const encrypted = await encryptWithServerKey<DeviceRiskPayload>(samplePayload, {
      serverKeyEncryption: {
        publicKeySpki: arrayBufferToBase64Url(publicKeySpki),
      },
    });

    await expect(decrypt<DeviceRiskPayload>(encrypted)).rejects.toThrow(
      "Encrypted payload bundle requires a server private key to decrypt key material.",
    );
  });

  it("throws when Web Crypto API is unavailable", async () => {
    vi.stubGlobal("crypto", {} as Crypto);

    await expect(encrypt(samplePayload)).rejects.toThrow(
      "Web Crypto API is not available in this browser.",
    );
  });
});
