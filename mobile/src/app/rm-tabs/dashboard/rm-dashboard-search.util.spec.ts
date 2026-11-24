import { RmCreditLate } from '../../core/services/rm/rm.models';
import { filterRmLateCredits } from './rm-dashboard-search.util';

describe('filterRmLateCredits', () => {
  const items = [
    { id: 1, clientName: 'Éléonore Kofi', reference: 'CR-001', collector: 'COM001', clientQuarter: 'Bè', clientPhone: '+228 90 11 22 33' },
    { id: 2, clientName: 'Ama Dossou', reference: 'CR-002', collector: 'COM002', clientQuarter: 'Tokoin', clientPhone: '99887766' }
  ] as unknown as RmCreditLate[];

  it('renvoie tout sans terme', () => {
    expect(filterRmLateCredits(items, '  ').length).toBe(2);
  });

  it('ignore accents et casse', () => {
    expect(filterRmLateCredits(items, 'eleonore').map(i => i.id)).toEqual([1]);
  });

  it('cherche par référence, commercial et localité', () => {
    expect(filterRmLateCredits(items, 'cr-002').map(i => i.id)).toEqual([2]);
    expect(filterRmLateCredits(items, 'com001').map(i => i.id)).toEqual([1]);
    expect(filterRmLateCredits(items, 'tokoin').map(i => i.id)).toEqual([2]);
  });

  it('cherche par téléphone sans séparateurs', () => {
    expect(filterRmLateCredits(items, '90112233').map(i => i.id)).toEqual([1]);
  });
});
