import type { Base64Url } from "../types";

/**
 * Converts a base64url string into an ArrayBuffer.
 */
export function base64UrlToArrayBuffer(value: Base64Url): ArrayBuffer {
  const base64 = normalizeBase64Url(value);
  const bytes = decodeBase64(base64);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

/**
 * Converts an ArrayBuffer into a base64url string.
 */
export function arrayBufferToBase64Url(value: ArrayBuffer): Base64Url {
  const bytes = new Uint8Array(value);
  const base64 = encodeBase64(bytes);
  return toBase64Url(base64);
}

/**
 * Converts a Uint8Array into a base64url string.
 */
export function uint8ArrayToBase64Url(value: Uint8Array): Base64Url {
  const base64 = encodeBase64(value);
  return toBase64Url(base64);
}

/**
 * Converts a base64url string into a Uint8Array.
 */
export function base64UrlToUint8Array(value: Base64Url): Uint8Array {
  return new Uint8Array(base64UrlToArrayBuffer(value));
}

/**
 * Normalizes base64url into padded RFC4648 base64.
 */
function normalizeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (normalized.length % 4)) % 4;
  return normalized + "=".repeat(padding);
}

/**
 * Converts base64 into base64url without padding.
 */
function toBase64Url(base64: string): Base64Url {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Decodes a base64 string into bytes in browser or Node runtime.
 */
function decodeBase64(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  const maybeBuffer = (globalThis as { Buffer?: { from(input: string, encoding: string): Uint8Array } }).Buffer;
  if (maybeBuffer) {
    return Uint8Array.from(maybeBuffer.from(base64, "base64"));
  }

  throw new Error("No base64 decoder is available in this runtime.");
}

/**
 * Encodes bytes into base64 in browser or Node runtime.
 */
function encodeBase64(value: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = "";
    for (let index = 0; index < value.byteLength; index += 1) {
      binary += String.fromCharCode(value[index]!);
    }
    return btoa(binary);
  }

  const maybeBuffer = (globalThis as {
    Buffer?: { from(input: Uint8Array): { toString(encoding: string): string } };
  }).Buffer;
  if (maybeBuffer) {
    return maybeBuffer.from(value).toString("base64");
  }

  throw new Error("No base64 encoder is available in this runtime.");
}