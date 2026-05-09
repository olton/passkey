import { arrayBufferToBase64Url, base64UrlToArrayBuffer, uint8ArrayToBase64Url } from '../utils';
import { DEFAULT_LOCALE, t } from '../i18n';

export type EncryptedPayloadBundle = {
    ciphertext: string;
    iv: string;
    keyMaterial?: string;
    encryptedKeyMaterial?: string;
    keyWrappingAlgorithm?: 'RSA-OAEP';
    keyWrappingHash?: 'SHA-256' | 'SHA-384' | 'SHA-512';
    keyWrappingKeyId?: string;
};

export type EncryptOptions = {
    serverKeyEncryption?: {
        publicKeySpki: string;
        keyId?: string;
        hash?: 'SHA-256' | 'SHA-384' | 'SHA-512';
    };
};

export type DecryptOptions = {
    serverKeyDecryption?: {
        privateKeyPkcs8: string;
        hash?: 'SHA-256' | 'SHA-384' | 'SHA-512';
    };
};

/**
 * Encrypts any JSON-serializable payload into a base64url encoded bundle.
 * @deprecated For transport security use encryptWithServerKey, because this mode stores raw key material in the bundle.
 */
export async function encrypt<TPayload>(payload: TPayload): Promise<string> {
    const cryptoApi = getCryptoApi();

    const key = await cryptoApi.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const iv = cryptoApi.getRandomValues(new Uint8Array(12));

    const plainBytes = new TextEncoder().encode(JSON.stringify(payload));
    const encrypted = await cryptoApi.subtle.encrypt({ name: 'AES-GCM', iv }, key, plainBytes);
    const rawKey = await cryptoApi.subtle.exportKey('raw', key);

    const bundle: EncryptedPayloadBundle = {
        ciphertext: arrayBufferToBase64Url(encrypted),
        iv: uint8ArrayToBase64Url(iv),
        keyMaterial: arrayBufferToBase64Url(rawKey),
    };

    return uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(bundle)));
}

/**
 * Encrypts payload and wraps symmetric key with server public key (RSA-OAEP).
 */
export async function encryptWithServerKey<TPayload>(payload: TPayload, options: EncryptOptions): Promise<string> {
    const cryptoApi = getCryptoApi();

    const key = await cryptoApi.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const iv = cryptoApi.getRandomValues(new Uint8Array(12));

    const plainBytes = new TextEncoder().encode(JSON.stringify(payload));
    const encrypted = await cryptoApi.subtle.encrypt({ name: 'AES-GCM', iv }, key, plainBytes);
    const rawKey = await cryptoApi.subtle.exportKey('raw', key);

    const serverConfig = options.serverKeyEncryption;
    if (!serverConfig?.publicKeySpki) {
        throw new Error(
            t(
                DEFAULT_LOCALE,
                'errors.crypto.serverPublicKeyMissing',
                'Server public key is required for secure payload encryption.',
            ),
        );
    }

    const wrappingHash = serverConfig.hash ?? 'SHA-256';
    const wrappingKey = await cryptoApi.subtle.importKey(
        'spki',
        base64UrlToArrayBuffer(serverConfig.publicKeySpki),
        { name: 'RSA-OAEP', hash: wrappingHash },
        false,
        ['encrypt'],
    );

    const encryptedKey = await cryptoApi.subtle.encrypt({ name: 'RSA-OAEP' }, wrappingKey, rawKey);

    const bundle: EncryptedPayloadBundle = {
        ciphertext: arrayBufferToBase64Url(encrypted),
        iv: uint8ArrayToBase64Url(iv),
        encryptedKeyMaterial: arrayBufferToBase64Url(encryptedKey),
        keyWrappingAlgorithm: 'RSA-OAEP',
        keyWrappingHash: wrappingHash,
        ...(serverConfig.keyId ? { keyWrappingKeyId: serverConfig.keyId } : {}),
    };

    return uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(bundle)));
}

/**
 * Decrypts a serialized payload.
 *
 * For bundles from `encryptWithServerKey`, pass `serverKeyDecryption.privateKeyPkcs8`.
 * This secure decrypt path is intended for server-side runtime where private keys are available.
 */
export async function decrypt<TPayload>(serialized: string, options?: DecryptOptions): Promise<TPayload> {
    const cryptoApi = getCryptoApi();

    const decoded = new TextDecoder().decode(base64UrlToArrayBuffer(serialized));
    const bundle = JSON.parse(decoded) as EncryptedPayloadBundle;

    const iv = new Uint8Array(base64UrlToArrayBuffer(bundle.iv));
    const rawKey = await resolveRawAesKeyMaterial(bundle, options);
    const key = await cryptoApi.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt']);
    const decrypted = await cryptoApi.subtle.decrypt({ name: 'AES-GCM', iv }, key, base64UrlToArrayBuffer(bundle.ciphertext));

    return JSON.parse(new TextDecoder().decode(new Uint8Array(decrypted))) as TPayload;
}

/**
 * Resolves AES key bytes from secure (wrapped) or legacy bundle.
 */
async function resolveRawAesKeyMaterial(bundle: EncryptedPayloadBundle, options?: DecryptOptions): Promise<ArrayBuffer> {
    const cryptoApi = getCryptoApi();

    if (bundle.encryptedKeyMaterial) {
        const unwrapConfig = options?.serverKeyDecryption;
        if (!unwrapConfig?.privateKeyPkcs8) {
            throw new Error(
                t(
                    DEFAULT_LOCALE,
                    'errors.crypto.serverPrivateKeyMissing',
                    'Encrypted payload bundle requires a server private key to decrypt key material.',
                ),
            );
        }

        const wrappingHash = bundle.keyWrappingHash ?? unwrapConfig.hash ?? 'SHA-256';
        const privateKey = await cryptoApi.subtle.importKey(
            'pkcs8',
            base64UrlToArrayBuffer(unwrapConfig.privateKeyPkcs8),
            { name: 'RSA-OAEP', hash: wrappingHash },
            false,
            ['decrypt'],
        );

        return cryptoApi.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, base64UrlToArrayBuffer(bundle.encryptedKeyMaterial));
    }

    if (!bundle.keyMaterial) {
        throw new Error(
            t(
                DEFAULT_LOCALE,
                'errors.crypto.keyMaterialMissing',
                'Encrypted payload does not contain key material.',
            ),
        );
    }

    return base64UrlToArrayBuffer(bundle.keyMaterial);
}

/**
 * Returns runtime crypto implementation with subtle API.
 */
function getCryptoApi(): Crypto {
    const cryptoApi = globalThis.crypto;
    if (!cryptoApi?.subtle || typeof cryptoApi.getRandomValues !== 'function') {
        throw new Error(t(DEFAULT_LOCALE, 'errors.crypto.webCryptoUnavailable', 'Web Crypto API is not available in this browser.'));
    }

    return cryptoApi;
}
