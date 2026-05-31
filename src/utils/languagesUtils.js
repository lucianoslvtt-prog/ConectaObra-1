// ── Languages Utilities ─────────────────────────────
// Centralized language list and helpers.
// Single source of truth — used by OnboardingPro, Profile, ProfessionalProfile.

export const LANGUAGES = [
    { id: 'es', name: 'Español', flag: '🇪🇸' },
    { id: 'en', name: 'Inglés', flag: '🇬🇧' },
    { id: 'fr', name: 'Francés', flag: '🇫🇷' },
    { id: 'pt', name: 'Portugués', flag: '🇵🇹' },
    { id: 'de', name: 'Alemán', flag: '🇩🇪' },
    { id: 'it', name: 'Italiano', flag: '🇮🇹' },
    { id: 'ro', name: 'Rumano', flag: '🇷🇴' },
    { id: 'ar', name: 'Árabe', flag: '🇸🇦' },
    { id: 'zh', name: 'Chino', flag: '🇨🇳' },
    { id: 'ru', name: 'Ruso', flag: '🇷🇺' },
    { id: 'uk', name: 'Ucraniano', flag: '🇺🇦' },
    { id: 'pl', name: 'Polaco', flag: '🇵🇱' },
    { id: 'nl', name: 'Neerlandés', flag: '🇳🇱' },
    { id: 'ja', name: 'Japonés', flag: '🇯🇵' },
    { id: 'ko', name: 'Coreano', flag: '🇰🇷' },
    { id: 'hi', name: 'Hindi', flag: '🇮🇳' },
    { id: 'bn', name: 'Bengalí', flag: '🇧🇩' },
    { id: 'tr', name: 'Turco', flag: '🇹🇷' },
    { id: 'sv', name: 'Sueco', flag: '🇸🇪' },
    { id: 'da', name: 'Danés', flag: '🇩🇰' },
    { id: 'no', name: 'Noruego', flag: '🇳🇴' },
    { id: 'fi', name: 'Finlandés', flag: '🇫🇮' },
    { id: 'el', name: 'Griego', flag: '🇬🇷' },
    { id: 'cs', name: 'Checo', flag: '🇨🇿' },
    { id: 'hu', name: 'Húngaro', flag: '🇭🇺' },
    { id: 'bg', name: 'Búlgaro', flag: '🇧🇬' },
    { id: 'hr', name: 'Croata', flag: '🇭🇷' },
    { id: 'sk', name: 'Eslovaco', flag: '🇸🇰' },
    { id: 'sl', name: 'Esloveno', flag: '🇸🇮' },
    { id: 'sr', name: 'Serbio', flag: '🇷🇸' },
    { id: 'he', name: 'Hebreo', flag: '🇮🇱' },
    { id: 'fa', name: 'Persa', flag: '🇮🇷' },
    { id: 'ur', name: 'Urdu', flag: '🇵🇰' },
    { id: 'th', name: 'Tailandés', flag: '🇹🇭' },
    { id: 'vi', name: 'Vietnamita', flag: '🇻🇳' },
    { id: 'id', name: 'Indonesio', flag: '🇮🇩' },
    { id: 'ms', name: 'Malayo', flag: '🇲🇾' },
    { id: 'tl', name: 'Tagalo', flag: '🇵🇭' },
    { id: 'sw', name: 'Suajili', flag: '🇰🇪' },
    { id: 'am', name: 'Amhárico', flag: '🇪🇹' },
    { id: 'ca', name: 'Catalán', flag: '🇪🇸' },
    { id: 'gl', name: 'Gallego', flag: '🇪🇸' },
    { id: 'eu', name: 'Euskera', flag: '🇪🇸' },
    { id: 'qu', name: 'Quechua', flag: '🇵🇪' },
    { id: 'gn', name: 'Guaraní', flag: '🇵🇾' },
];

/**
 * Look up a language by its ID.
 * @param {string} id - ISO language code, e.g. 'es'
 * @returns {{ id: string, name: string, flag: string } | null}
 */
export const getLanguageById = (id) => {
    return LANGUAGES.find(l => l.id === id) || null;
};

/**
 * Format an array of language IDs into a readable string.
 * @param {string[]|null} arr - e.g. ['es', 'en']
 * @returns {string} - e.g. 'Español 🇪🇸 · Inglés 🇬🇧' or '' if empty/null
 */
export const formatLanguagesList = (arr) => {
    if (!arr || arr.length === 0) return '';
    return arr
        .map(id => {
            const lang = getLanguageById(id);
            return lang ? `${lang.name} ${lang.flag}` : id;
        })
        .join(' · ');
};
