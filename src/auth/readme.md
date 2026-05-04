# auth module

## Призначення

Високорівневий модуль для passkey-аутентифікації на сайті.

## Що реалізовано

- `register` реєстрація passkey.
- `login` passwordless логін на сайті.
- `confirmSensitiveAction` підтвердження ризикових дій.
- `authenticate` універсальний метод для нестандартних сценаріїв.

## Приклад використання

```ts
import { PasskeyAuthService } from "../auth";

const auth = new PasskeyAuthService(adapter);

await auth.register({
  user: {
    id: "user_1",
    username: "john@company.com",
    displayName: "John",
  },
});

const loginResult = await auth.login({ username: "john@company.com" });
```

## Примітки

- Модуль залежить від `PasskeyBackendAdapter` і `WebAuthnService`.
- Для MFA-подібних сценаріїв задавайте різні `purpose` і `context`.
- Backend повинен валідовувати challenge, origin, rpId і signature counter.
