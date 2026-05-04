import { describe, expect, it } from "vitest";
import {
  arrayBufferToBase64Url,
  base64UrlToArrayBuffer,
  base64UrlToUint8Array,
  uint8ArrayToBase64Url,
} from "../../src/utils";

describe("base64url utils", () => {
  it("converts ArrayBuffer to base64url and back", () => {
    const source = new TextEncoder().encode("passkey-sdk");
    const encoded = arrayBufferToBase64Url(source.buffer as ArrayBuffer);
    const decoded = new Uint8Array(base64UrlToArrayBuffer(encoded));

    expect(Array.from(decoded)).toEqual(Array.from(source));
  });

  it("converts Uint8Array to base64url and back", () => {
    const source = new Uint8Array([1, 2, 3, 4, 5]);
    const encoded = uint8ArrayToBase64Url(source);
    const decoded = base64UrlToUint8Array(encoded);

    expect(decoded).toEqual(source);
  });
});
