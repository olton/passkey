# errors module

## Призначення

Централізований шар помилок SDK для уніфікованої обробки збоїв у застосунку.

## Доступні помилки

- `PasskeyError` базовий клас.
- `PasskeyNotSupportedError` браузер не підтримує WebAuthn.
- `UserCancelledError` користувач скасував біометричний промпт.
- `BackendAdapterError` помилка HTTP/API взаємодії.

## Приклад використання

```ts
import { UserCancelledError } from "../errors";

try {
  // start passkey flow
} catch (error) {
  if (error instanceof UserCancelledError) {
    // show a non-blocking UI hint
  }
}
```

## Примітки

- Рекомендується у UI розділяти `UserCancelledError` та реальні технічні помилки.
- `BackendAdapterError` містить `status` і `details` для логування або Sentry breadcrumbs.
