export default {
    'errors.passkeyNotSupported': 'Цей браузер не підтримує passkeys.',
    'errors.userCancelled': 'Користувач скасував passkey-процедуру.',
    'errors.webauthn.registrationNotPublicKeyCredential': 'Реєстрація WebAuthn не повернула PublicKeyCredential.',
    'errors.webauthn.authenticationNotPublicKeyCredential': 'Автентифікація WebAuthn не повернула PublicKeyCredential.',
    'errors.webauthn.unknown': 'Невідома помилка WebAuthn.',
    'errors.crypto.webCryptoUnavailable': 'Web Crypto API недоступний у цьому браузері.',
    'errors.base64.decoderUnavailable': 'У цьому середовищі немає доступного base64-декодера.',
    'errors.base64.encoderUnavailable': 'У цьому середовищі немає доступного base64-енкодера.',
    'errors.useCases.unsupportedScenario': 'Непідтримуваний payload сценарію',
    'payments.stepUp.passkeyNotSupported': 'Браузер не підтримує passkeys, потрібен fallback на 3DS.',
    'payments.stepUp.enrollmentRequired': 'Для цього акаунта не знайдено зареєстрований платіжний passkey. Дотримуйтесь політики backend/product щодо верифікації, enrollment або fallback.',
} as const;
