import { RmCreditLate } from '../../core/services/rm/rm.models';
import { normalizeRmSearch } from '../field/rm-field-search.util';

/** Filtre en mémoire les retards du pack (hors ligne, ou repli si le serveur échoue). */
export function filterRmLateCredits(items: RmCreditLate[], query: string): RmCreditLate[] {
  const q = normalizeRmSearch(query);
  if (!q) {
    return items;
  }
  const digits = q.replace(/\D/g, '');
  return items.filter(item => {
    const text = normalizeRmSearch(
      [item.clientName, item.reference, item.collector, item.clientQuarter, item.clientPhone].join(' ')
    );
    if (text.includes(q)) {
      return true;
    }
    return digits.length >= 3 && text.replace(/\D/g, '').includes(digits);
  });
}
