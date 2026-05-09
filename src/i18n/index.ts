import en from './en';
import uk from './uk';

export const DEFAULT_LOCALE = 'en';

const translations = {
    en,
    en_US: en,
    uk,
    uk_UA: uk,
} as const;

export type SupportedLocale = keyof typeof translations;
export type TranslationKey = keyof (typeof translations)['en'];

/**
 * Returns localized text by locale and key. Falls back to defaultValue, then key.
 */
export function t(locale: string, key: TranslationKey | string, defaultValue?: string): string {
    const requestedLocale = locale as SupportedLocale;
    const byLocale = translations[requestedLocale] as Record<string, string> | undefined;
    const byDefaultLocale = translations[DEFAULT_LOCALE] as Record<string, string>;

    return byLocale?.[key] ?? byDefaultLocale[key] ?? defaultValue ?? key;
}

export const I18N_TRANSLATIONS = translations;
