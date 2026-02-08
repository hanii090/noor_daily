/**
 * Approximate Gregorian → Hijri date conversion
 * Uses the Kuwaiti algorithm (commonly used in Islamic apps)
 */

const HIJRI_MONTHS = [
    'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
    'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
    'Ramadan', 'Shawwal', 'Dhul Qi\'dah', 'Dhul Hijjah',
];

interface HijriDate {
    day: number;
    month: number;
    monthName: string;
    year: number;
    formatted: string;
}

export function toHijri(date: Date = new Date()): HijriDate {
    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear();

    let jd =
        Math.floor((1461 * (y + 4800 + Math.floor((m - 13) / 12))) / 4) +
        Math.floor((367 * (m - 1 - 12 * Math.floor((m - 13) / 12))) / 12) -
        Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 13) / 12)) / 100)) / 4) +
        d -
        32075;

    // Julian day to Hijri
    const l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j =
        Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
        Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
    const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    const hMonth = Math.floor((24 * l3) / 709);
    const hDay = l3 - Math.floor((709 * hMonth) / 24);
    const hYear = 30 * n + j - 30;

    return {
        day: hDay,
        month: hMonth,
        monthName: HIJRI_MONTHS[hMonth - 1] || '',
        year: hYear,
        formatted: `${hDay} ${HIJRI_MONTHS[hMonth - 1] || ''} ${hYear} AH`,
    };
}
