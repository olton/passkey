# @olton/passkey

Passkey SDK для вебавтентифікації та сценаріїв step-up перевірки платежів.

Бібліотека допомагає реалізувати WebAuthn-потоки passkey для:

- безпарольного входу
- підтвердження чутливих дій
- step-up перевірки платежів як альтернативи 3DS (із fallback)
- сценарно-орієнтованої оркестрації для вебклієнтів

## Можливості

- типізовані WebAuthn DTO для контрактів бекенда
- браузерний транспортний сервіс WebAuthn
- плагінний адаптер бекенда
- високорівневі сервіси автентифікації та платежів
- єдиний фасадний клієнт для інтеграції
- згенеровані файли декларацій TypeScript

## Встановлення

```bash
npm i @olton/passkey
```

## Швидкий старт

```ts
import {
	createFetchBackendAdapter,
	createPasskeyClient,
} from "@olton/passkey";

const adapter = createFetchBackendAdapter({
	baseUrl: "https://api.example.com",
});

const passkey = createPasskeyClient({ adapter });

await passkey.register({
	user: {
		id: "user_1",
		username: "demo@example.com",
		displayName: "Demo User",
	},
});

const loginResult = await passkey.login({
	username: "demo@example.com",
});
```

## Експорти модуля

Нижче наведено повний перелік експортів із `@olton/passkey`.

### Фасад клієнта

- `createPasskeyClient` - фабрика для створення `PasskeyClient`.
- `PasskeyClient` - головний фасад SDK для реєстрації, логіну, step-up та сценаріїв.
- `PasskeyClientConfig` - конфігурація фасаду (адаптер бекенда та опційний WebAuthn-сервіс).

### Адаптер бекенда

- `PasskeyBackendAdapter` - контракт API-адаптера для registration/auth/payment потоків.
- `PasskeyBackendEndpoints` - набір endpoint-шляхів для fetch-адаптера.
- `FetchBackendAdapterConfig` - конфігурація fetch-адаптера (base URL, заголовки, endpoint-и).
- `createFetchBackendAdapter` - створює адаптер для інтеграції з вашим бекендом через `fetch`.

### Сервіси автентифікації та платежів

- `PasskeyAuthService` - високорівневий сервіс для реєстрації та автентифікації.
- `PaymentStepUpService` - оркестрація passkey step-up підтвердження карткової оплати.
- `WebClientUseCases` - сценарно-орієнтований orchestrator для вебклієнта.

### Сценарні контракти (use cases)

- `LoginUseCaseRequest` - payload для сценарію входу.
- `PaymentStepUpUseCaseRequest` - payload для сценарію payment step-up.
- `SensitiveActionUseCaseRequest` - payload для сценарію підтвердження чутливої дії.
- `PasswordlessRecoveryUseCaseRequest` - payload для сценарію passwordless recovery.
- `WebClientUseCaseRequest` - union усіх підтриманих сценарних запитів.
- `WebClientUseCaseResponse` - уніфікований тип відповіді сценарного orchestrator-а.

### WebAuthn транспорт

- `WebAuthnService` - браузерний транспортний сервіс WebAuthn (створення credential + assertion).

### Помилки SDK

- `PasskeyError` - базова помилка SDK.
- `PasskeyNotSupportedError` - браузер/середовище не підтримує WebAuthn.
- `UserCancelledError` - користувач скасував passkey-церемонію.
- `BackendAdapterError` - помилки HTTP/контракту при роботі адаптера бекенда.

### Утиліти base64url

- `base64UrlToArrayBuffer` - перетворює base64url у `ArrayBuffer`.
- `arrayBufferToBase64Url` - перетворює `ArrayBuffer` у base64url.
- `uint8ArrayToBase64Url` - перетворює `Uint8Array` у base64url.
- `base64UrlToUint8Array` - перетворює base64url у `Uint8Array`.

### Базові типи домену та рішення

- `Base64Url` - рядок у форматі base64url.
- `StepUpDecision` - рішення step-up перевірки: approve/fallback/reject.
- `WebClientScenario` - перелік бізнес-сценаріїв вебклієнта.

### Профіль користувача, ризик-сигнали, платіжний контекст

- `PasskeyUser` - дані користувача для реєстрації passkey.
- `RiskSignals` - опційні сигнали ризику для fraud/risk-аналізу.
- `CardPaymentContext` - бізнес-контекст карткового платежу.

### WebAuthn JSON DTO

- `PublicKeyCredentialDescriptorJSON` - JSON-представлення credential descriptor.
- `PublicKeyCredentialUserEntityJSON` - JSON-представлення користувача WebAuthn.
- `PublicKeyCredentialCreationOptionsJSON` - JSON-опції створення credential (registration).
- `PublicKeyCredentialRequestOptionsJSON` - JSON-опції assertion (authentication/payment).
- `CredentialAttestationJSON` - серіалізований результат реєстрації passkey.
- `CredentialAssertionJSON` - серіалізований результат автентифікації passkey.

### Запити до бекенда

- `BeginRegistrationInput` - payload запиту на отримання registration options.
- `FinishRegistrationInput` - payload запиту на верифікацію реєстрації.
- `BeginAuthenticationInput` - payload запиту на отримання authentication options.
- `FinishAuthenticationInput` - payload запиту на верифікацію автентифікації.
- `BeginPaymentStepUpInput` - payload запиту на отримання payment step-up options.
- `FinishPaymentStepUpInput` - payload запиту на верифікацію payment step-up.

### Результати верифікації та сесія

- `AuthSession` - сесійні дані після успішної автентифікації.
- `RegistrationVerificationResult` - результат верифікації реєстрації.
- `AuthenticationVerificationResult` - результат верифікації автентифікації.
- `PaymentStepUpVerificationResult` - результат верифікації payment step-up на бекенді.
- `PaymentStepUpResult` - фінальний результат step-up для клієнта (включно з флагами fallback/3DS).

## Приклади використання

### 1) Безпарольний вхід

```ts
const loginResult = await passkey.login({
	username: "demo@example.com",
	context: {
		source: "web",
	},
});

if (loginResult.verified) {
	console.log("Вхід виконано");
}
```

### 2) Підтвердження чутливої дії

```ts
const confirmResult = await passkey.confirmSensitiveAction({
	userId: "user_1",
	context: {
		action: "change-payout-account",
	},
});
```

### 3) Step-Up перевірка оплати карткою

```ts
const paymentResult = await passkey.confirmCardPayment({
	payment: {
		paymentIntentId: "pi_100",
		amountMinor: 45000,
		currency: "UAH",
		merchantId: "merchant_1",
	},
	userId: "user_1",
});

if (paymentResult.shouldTrigger3DS) {
	// fallback на класичний 3DS-челендж
}
```

### 4) Сценарно-орієнтований потік

```ts
const result = await passkey.runUseCase({
	scenario: "payment-step-up",
	input: {
		payment: {
			paymentIntentId: "pi_101",
			amountMinor: 1000,
			currency: "UAH",
			merchantId: "merchant_1",
		},
		userId: "user_1",
	},
});
```

## Запуск демо локально

### 1) Запустіть mock-бекенд

```bash
npm run server
```

URL за замовчуванням: `http://localhost:4000`

### 2) Запустіть демо-інтерфейс

```bash
npm run dev
```

Відкрийте: `http://localhost:5173`

### 3) Спробуйте сценарії в демо

- Зареєструйте passkey
- Виконайте вхід за допомогою passkey
- Підтвердьте чутливу дію
- Підтвердьте оплату карткою

Порада: залишайте `Use mock WebAuthn transport` увімкненим для передбачуваної локальної поведінки.

## Результати збірки

- ESM bundle: `dist/prod/passkey.es.js`
- CJS bundle: `dist/prod/passkey.cjs.js`
- Type declarations: `dist/types/index.d.ts`

## Скрипти

- `npm run dev` - запустити демо-інтерфейс
- `npm run server` - запустити mock-бекенд
- `npm run test` - запустити тестовий набір
- `npm run build:prod` - зібрати production-бандли та декларації
- `npm run build` - lint + typecheck + test + production збірка
