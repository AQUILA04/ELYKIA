import { Pipe, PipeTransform } from '@angular/core';

const NARROW_NBSP = ' ';
const MINUS = '−';

/**
 * Montant en francs CFA, format unique du rapport commerciaux : « 100 300 F ».
 * Séparateur de milliers insécable, pas de décimales, vrai signe moins.
 * `signed` ajoute « + » aux montants positifs (écarts).
 */
export function formatFcfa(value: number | string | null | undefined, options?: { signed?: boolean; unit?: boolean }): string {
    const amount = Math.round(Number(value) || 0);
    const digits = Math.abs(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NBSP);
    let sign = '';
    if (amount < 0) {
        sign = MINUS;
    } else if (options?.signed && amount > 0) {
        sign = '+';
    }
    return options?.unit === false ? `${sign}${digits}` : `${sign}${digits}${NARROW_NBSP}F`;
}

@Pipe({ name: 'fcfa', standalone: false })
export class FcfaPipe implements PipeTransform {
    transform(value: number | string | null | undefined, mode?: 'signed' | 'bare'): string {
        return formatFcfa(value, { signed: mode === 'signed', unit: mode !== 'bare' });
    }
}
