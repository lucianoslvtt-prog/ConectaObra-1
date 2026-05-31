// ── Business Hours Utilities ─────────────────────────
// Centralized helpers for structured business hours (JSONB)
// Used by: OnboardingPro, ProfessionalProfile, StoreList

export const DAYS_CONFIG = [
    { key: 'monday',    label: 'Lunes' },
    { key: 'tuesday',   label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday',  label: 'Jueves' },
    { key: 'friday',    label: 'Viernes' },
    { key: 'saturday',  label: 'Sábado' },
    { key: 'sunday',    label: 'Domingo' },
];

export const TIMEZONES = [
    { value: 'Europe/Madrid',       label: 'España (Península y Baleares)' },
    { value: 'Atlantic/Canary',     label: 'España (Canarias)' },
    { value: 'Africa/Ceuta',       label: 'España (Ceuta y Melilla)' },
    { value: 'America/Mexico_City', label: 'México' },
    { value: 'America/Bogota',     label: 'Colombia' },
    { value: 'America/Lima',       label: 'Perú' },
    { value: 'America/Buenos_Aires', label: 'Argentina' },
    { value: 'America/Santiago',   label: 'Chile' },
    { value: 'America/Caracas',    label: 'Venezuela' },
    { value: 'America/Montevideo', label: 'Uruguay' },
];

// ── Time helpers (internal) ─────────────────────────

// "09:30" → 570 (minutes since midnight)
const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

// 570 → "9:30" (no leading zero for readability)
const minutesToDisplay = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
};

// "09:00" → "9:00" (strip leading zero from hour)
const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    return `${parseInt(h, 10)}:${m}`;
};

// Get current day key and time in a given timezone using Intl API
const getNowInTimezone = (timezone) => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    }).formatToParts(now);

    let weekday = '', hour = 0, minute = 0;
    for (const p of parts) {
        if (p.type === 'weekday') weekday = p.value.toLowerCase();
        if (p.type === 'hour') hour = parseInt(p.value, 10);
        if (p.type === 'minute') minute = parseInt(p.value, 10);
    }
    // Handle midnight edge case: hour 24 → 0
    if (hour === 24) hour = 0;

    return { dayKey: weekday, currentMinutes: hour * 60 + minute };
};

// ── Public API ──────────────────────────────────────

/**
 * Format an array of time slots into a readable string.
 * @param {Array} slots - e.g. [{ open: "09:00", close: "14:00" }, { open: "16:00", close: "20:00" }]
 * @returns {string} - e.g. "9:00 - 14:00  ·  16:00 - 20:00" or "Cerrado"
 */
export const formatDaySchedule = (slots) => {
    if (!slots || slots.length === 0) return 'Cerrado';
    return slots
        .map(s => `${formatTime(s.open)} - ${formatTime(s.close)}`)
        .join('  ·  ');
};

/**
 * Determine if a business is currently open based on structured hours + timezone.
 * @param {Object|null} businessHours - JSONB object with day keys
 * @param {string} timezone - IANA timezone string
 * @returns {{ isOpen: boolean, nextChange: string|null, label: string|null }}
 */
export const isOpenNow = (businessHours, timezone = 'Europe/Madrid') => {
    if (!businessHours) return { isOpen: false, nextChange: null, label: null };

    const { dayKey, currentMinutes } = getNowInTimezone(timezone);
    const todaySlots = businessHours[dayKey] || [];

    // Check if currently inside any slot
    for (const slot of todaySlots) {
        const open = timeToMinutes(slot.open);
        const close = timeToMinutes(slot.close);
        if (currentMinutes >= open && currentMinutes < close) {
            return {
                isOpen: true,
                nextChange: formatTime(slot.close),
                label: `Cierra a las ${formatTime(slot.close)}`,
            };
        }
    }

    // Not open right now — find next opening
    // First: check if there's a later slot TODAY
    for (const slot of todaySlots) {
        const open = timeToMinutes(slot.open);
        if (open > currentMinutes) {
            return {
                isOpen: false,
                nextChange: formatTime(slot.open),
                label: `Abre a las ${formatTime(slot.open)}`,
            };
        }
    }

    // No more slots today — search upcoming days (up to 7)
    const dayKeys = DAYS_CONFIG.map(d => d.key);
    const todayIndex = dayKeys.indexOf(dayKey);

    for (let offset = 1; offset <= 7; offset++) {
        const nextIndex = (todayIndex + offset) % 7;
        const nextDayKey = dayKeys[nextIndex];
        const nextSlots = businessHours[nextDayKey] || [];

        if (nextSlots.length > 0) {
            const nextOpen = formatTime(nextSlots[0].open);
            const nextDayLabel = DAYS_CONFIG[nextIndex].label;

            if (offset === 1) {
                return {
                    isOpen: false,
                    nextChange: nextOpen,
                    label: `Abre mañana a las ${nextOpen}`,
                };
            }
            return {
                isOpen: false,
                nextChange: nextOpen,
                label: `Abre el ${nextDayLabel.toLowerCase()} a las ${nextOpen}`,
            };
        }
    }

    // All 7 days empty (shouldn't happen if data exists, but safety)
    return { isOpen: false, nextChange: null, label: 'Cerrado' };
};
