import {
  arrayBufferToBase64Url,
  base64UrlToArrayBuffer,
  uint8ArrayToBase64Url,
} from "../utils";

export type EncryptedPayloadBundle = {
  ciphertext: string;
  iv: string;
  keyMaterial: string;
};

/**
 * Encrypts any JSON-serializable payload into a base64url encoded bundle.
 */
export async function encrypt<TPayload>(payload: TPayload): Promise<string> {
  const cryptoApi = getCryptoApi();

  const key = await cryptoApi.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const iv = cryptoApi.getRandomValues(new Uint8Array(12));

  const plainBytes = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await cryptoApi.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plainBytes,
  );
  const rawKey = await cryptoApi.subtle.exportKey("raw", key);

  const bundle: EncryptedPayloadBundle = {
    ciphertext: arrayBufferToBase64Url(encrypted),
    iv: uint8ArrayToBase64Url(iv),
    keyMaterial: arrayBufferToBase64Url(rawKey),
  };

  return uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(bundle)));
}

/**
 * Decrypts a serialized payload previously produced by encrypt<TPayload>.
 */
export async function decrypt<TPayload>(serialized: string): Promise<TPayload> {
  const cryptoApi = getCryptoApi();

  const decoded = new TextDecoder().decode(base64UrlToArrayBuffer(serialized));
  const bundle = JSON.parse(decoded) as EncryptedPayloadBundle;

  const iv = new Uint8Array(base64UrlToArrayBuffer(bundle.iv));
  const key = await cryptoApi.subtle.importKey(
    "raw",
    base64UrlToArrayBuffer(bundle.keyMaterial),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const decrypted = await cryptoApi.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    base64UrlToArrayBuffer(bundle.ciphertext),
  );

  return JSON.parse(new TextDecoder().decode(new Uint8Array(decrypted))) as TPayload;
}

/**
 * Returns runtime crypto implementation with subtle API.
 */
function getCryptoApi(): Crypto {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle || typeof cryptoApi.getRandomValues !== "function") {
    throw new Error("Web Crypto API is not available in this browser.");
  }

  return cryptoApi;
}