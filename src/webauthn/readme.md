# webauthn module

## Призначення

Низькорівневий сервіс для роботи з браузерним WebAuthn API:

- Створення passkey credential (registration).
- Отримання assertion (authentication / step-up).
- Серіалізація відповіді у JSON-safe формат для backend.

## Основні функції

- `isSupported()` перевірка підтримки WebAuthn.
- `createCredential(options)` запуск registration ceremony.
- `getAssertion(options)` запуск authentication ceremony.

## Приклад використання

```ts
import { WebAuthnService } from "../webauthn";

const webAuthn = new WebAuthnService();

if (webAuthn.isSupported()) {
  const attestation = await webAuthn.createCredential(optionsFromApi);
  await api.verifyRegistration(attestation);
}
```

## Примітки

- `NotAllowedError` мапиться на `UserCancelledError`.
- `PasskeyNotSupportedError` дозволяє швидко вирішити fallback-поведінку в UI.
- Сервіс не зберігає стан і безпечний для повторного використання.
