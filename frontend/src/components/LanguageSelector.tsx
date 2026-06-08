import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, languages } from '../i18n';
import { CaretDownIcon, GlobeIcon } from '@phosphor-icons/react';

export const LanguageSelector = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

    const handleChange = (code: string) => {
        changeLanguage(code);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
                <GlobeIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm">{currentLang.flag} {currentLang.code.toUpperCase()}</span>
                <CaretDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-lg bg-gray-800 shadow-lg border border-gray-700 overflow-hidden z-50">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleChange(lang.code)}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-700 transition-colors ${i18n.language === lang.code ? 'bg-gray-700' : ''
                                }`}
                        >
                            <span className="text-lg">{lang.flag}</span>
                            <span className="text-sm">{lang.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
