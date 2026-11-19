/** Période et commercial du rapport, partagés par les écrans via les paramètres d'URL. */
export type PeriodPreset = 'today' | 'week' | 'month' | 'custom';

export interface ReportFilters {
    preset: PeriodPreset;
    /** yyyy-MM-dd */
    start: string;
    /** yyyy-MM-dd */
    end: string;
    commercial: string | null;
}

export function toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function parseIsoDate(value: string | null | undefined): Date | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

/** Bornes d'un raccourci de période ; la semaine commence le lundi, comme l'écran historique. */
export function presetRange(preset: Exclude<PeriodPreset, 'custom'>, today: Date = new Date()): { start: string; end: string } {
    const end = toIsoDate(today);
    switch (preset) {
        case 'week': {
            const day = today.getDay();
            const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (day === 0 ? 6 : day - 1));
            return { start: toIsoDate(monday), end };
        }
        case 'month':
            return { start: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)), end };
        default:
            return { start: end, end };
    }
}

/** Lit les filtres depuis l'URL ; par défaut « Aujourd'hui ». */
export function filtersFromParams(params: { get(name: string): string | null }, today: Date = new Date()): ReportFilters {
    const commercial = params.get('commercial') || null;
    const preset = params.get('period') as PeriodPreset | null;
    if (preset === 'week' || preset === 'month' || preset === 'today') {
        return { preset, ...presetRange(preset, today), commercial };
    }
    const start = parseIsoDate(params.get('start'));
    const end = parseIsoDate(params.get('end'));
    if (start && end && start <= end) {
        return { preset: 'custom', start: toIsoDate(start), end: toIsoDate(end), commercial };
    }
    return { preset: 'today', ...presetRange('today', today), commercial };
}

/** Paramètres d'URL des filtres : un raccourci reste un raccourci (lien toujours à jour). */
export function filtersToParams(filters: ReportFilters): Record<string, string | null> {
    if (filters.preset !== 'custom') {
        return { period: filters.preset, start: null, end: null, commercial: filters.commercial || null };
    }
    return { period: null, start: filters.start, end: filters.end, commercial: filters.commercial || null };
}

/** Paramètres compris par l'ancienne présentation (lien profond). */
export function classicParams(filters: ReportFilters): Record<string, string> {
    const params: Record<string, string> = { startDate: filters.start, endDate: filters.end };
    if (filters.commercial) {
        params['collector'] = filters.commercial;
    }
    return params;
}

export function isSingleDay(filters: ReportFilters): boolean {
    return filters.start === filters.end;
}

export const PRESET_COMPARE_LABELS: Record<PeriodPreset, string> = {
    today: 'vs hier',
    week: 'vs semaine précédente',
    month: 'vs période précédente',
    custom: 'vs période précédente'
};
