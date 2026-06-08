import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ru from './locales/ru.json';
import kz from './locales/kz.json';

const resources = {
    en: { translation: en },
    ru: { translation: ru },
    kz: { translation: kz },
};

const safeLocalStorage = {
    getItem: (key: string) => {
        try {
            return window.localStorage.getItem(key);
        } catch {
            return null;
        }
    },
    setItem: (key: string, value: string) => {
        try {
            window.localStorage.setItem(key, value);
        } catch {
            // Storage can be unavailable in restricted webviews.
        }
    },
};

// Detect user language from Telegram or browser
const detectLanguage = (): string => {
    // Try Telegram WebApp language
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.language_code) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tgLang = (window as any).Telegram.WebApp.initDataUnsafe.user.language_code;
        if (['en', 'ru', 'kz'].includes(tgLang)) return tgLang;
        if (tgLang === 'kk') return 'kz'; // Kazakh language code
    }

    // Try localStorage
    const saved = safeLocalStorage.getItem('language');
    if (saved && ['en', 'ru', 'kz'].includes(saved)) return saved;

    // Try browser language
    const browserLang = navigator.language?.split('-')[0];
    if (['en', 'ru', 'kz'].includes(browserLang)) return browserLang;

    return 'en';
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: detectLanguage(),
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    safeLocalStorage.setItem('language', lang);
};

export const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'kz', name: 'Қазақша', flag: '🇰🇿' },
];

export default i18n;
