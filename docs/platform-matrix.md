# Platform Authenticator Matrix

This document explains what "platform authenticator" usually means on each operating system and how to plan passkey UX with @olton/passkey.

## Scope and important caveat

- WebAuthn behavior is decided by browser + OS + device hardware.
- There is no single universal behavior that is guaranteed on all devices.
- This SDK uses browser WebAuthn APIs and does not hardcode OS-specific authenticator vendors.

## Quick matrix

| Platform | Typical platform authenticator | Browser support expectation | Most reliable fallback |
|---|---|---|---|
| Windows | Windows Hello (Face, fingerprint, PIN) | Strong in modern Chromium/Edge environments | Security key (USB/NFC) or phone passkey |
| macOS | Touch ID / device passcode via Apple platform stack | Strong in Safari and modern Chromium | Security key or iPhone passkey flow |
| iOS | Face ID / Touch ID / device passcode | Strong in Safari and modern browsers on iOS | Another Apple device or security key where available |
| Android | Built-in biometric + device credential (PIN/pattern/password) | Strong in modern Chrome and WebView ecosystems | Security key or another synced passkey provider |
| Linux | Distribution and browser dependent local authenticator availability | Varies significantly across distro/browser/hardware combinations | Security key or phone passkey (recommended primary path) |

## Linux-specific guidance

Linux has no single equivalent to Windows Hello that is consistently available everywhere.

For a practical setup baseline, use [docs/linux-ubuntu-24-04-demo.md](docs/linux-ubuntu-24-04-demo.md).

What this means in practice:

1. Some Linux environments can use a local authenticator path.
2. Some environments will not expose a stable platform authenticator UX.
3. Roaming authenticators (USB/NFC keys) are usually the most predictable option.
4. Phone passkey flows are often the second reliable option.

## Product decision recommendation

For cross-platform production deployments:

1. Treat platform authenticator as capability-based, not mandatory.
2. Always provide at least one roaming authenticator path.
3. Keep recovery UX for users without local biometric support.
4. Avoid OS-specific assumptions in frontend copy and backend policy.

## Suggested policy by flow

| Flow | Preferred method | Linux recommendation |
|---|---|---|
| Registration | Platform authenticator when available | Offer security key and phone passkey options clearly |
| Login | Existing enrolled passkey | If assertion fails due environment mismatch, suggest alternate enrolled authenticator |
| Sensitive action | Higher assurance path | Require user verification and provide fallback to another enrolled authenticator |
| Payment step-up | Passkey first, risk-driven fallback | Keep 3DS fallback enabled for unsupported/low-confidence environments |

## UX copy suggestions

Use neutral, capability-based wording in UI:

- Preferred: "Use passkey"
- Preferred: "Use this device or a security key"
- Avoid: "Use Windows Hello" as a global label on non-Windows platforms

## Testing checklist

1. Test at least one Linux distro with Chromium-based browser.
2. Test one Linux setup with external security key only.
3. Verify browser prompt appears on localhost and HTTPS origins.
4. Verify fallback UX when local authenticator is unavailable.
5. Verify backend decisions still return expected fallback_to_3ds when required.

## How this connects to API contract

Platform differences do not change backend endpoint structure.

Your backend contract remains the same:

- POST /passkeys/registration/options
- POST /passkeys/registration/verify
- POST /passkeys/authentication/options
- POST /passkeys/authentication/verify
- POST /passkeys/payments/options
- POST /passkeys/payments/verify

See docs/api-contract.md for request and response details.