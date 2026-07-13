import { computeRecoveryReceiptBalances, formatClientDisplayName } from './printing.service';
import { Distribution } from '../../models/distribution.model';

describe('formatClientDisplayName', () => {
  it('retourne fullName quand il est renseigné', () => {
    expect(formatClientDisplayName({ fullName: 'Jean Dupont', firstname: null, lastname: null })).toBe('Jean Dupont');
  });

  it('retourne prénom + nom quand fullName est absent', () => {
    expect(formatClientDisplayName({ fullName: null, firstname: 'Jean', lastname: 'Dupont' })).toBe('Jean Dupont');
  });

  it('évite d’afficher "null" quand seul fullName est disponible en base', () => {
    expect(formatClientDisplayName({ fullName: 'Marie Koffi', firstname: null, lastname: null })).not.toContain('null');
  });

  it('retourne "Client" si aucune information exploitable', () => {
    expect(formatClientDisplayName(null)).toBe('Client');
    expect(formatClientDisplayName({ fullName: null, firstname: null, lastname: null })).toBe('Client');
  });
});

describe('computeRecoveryReceiptBalances', () => {  const baseDistribution = {
    totalAmount: 14200,
    advance: 200,
    paidAmount: 200,
    remainingAmount: 14000,
  } as Distribution;

  it('calcule les soldes quand la distribution n’est pas encore mise à jour après le recouvrement', () => {
    const balances = computeRecoveryReceiptBalances(baseDistribution, 2000);

    expect(balances.previousRemainingAmount).toBe(14000);
    expect(balances.newRemainingAmount).toBe(12000);
  });

  it('calcule les soldes quand la distribution reflète déjà le recouvrement', () => {
    const updatedDistribution = {
      ...baseDistribution,
      paidAmount: 2200,
      remainingAmount: 12000,
    } as Distribution;

    const balances = computeRecoveryReceiptBalances(updatedDistribution, 2000);

    expect(balances.previousRemainingAmount).toBe(14000);
    expect(balances.newRemainingAmount).toBe(12000);
  });
});
