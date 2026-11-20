import { PrintableTontineOrder, PrintingService, computeRecoveryReceiptBalances, formatClientDisplayName } from './printing.service';
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

describe('PrintingService tontine order ticket', () => {
  const service = new PrintingService({ cashSnapshot: false } as any);
  const order = (overrides: Partial<PrintableTontineOrder> = {}): PrintableTontineOrder => ({
    reference: 'LIV-1',
    status: 'PENDING',
    totalAmount: 55000,
    items: [],
    ...overrides
  });
  const html = (o: PrintableTontineOrder): string => (service as any).generateTontineOrderReceiptHTML(o);

  it('prints the net balance and the amount still to pay', () => {
    const ticket = html(order({ netContribution: 40000 }));
    expect(ticket).toContain('Solde net cotise:');
    expect(ticket).toContain('RESTE A PAYER:');
    expect(ticket).not.toContain('RELIQUAT');
  });

  it('prints the balance to refund when the order is below the balance', () => {
    const ticket = html(order({ netContribution: 60000, totalAmount: 45500 }));
    expect(ticket).toContain('RELIQUAT A RESTITUER:');
    expect(ticket).not.toContain('RESTE A PAYER');
  });

  it('prints contributed, used and remaining totals once delivered', () => {
    const ticket = html(order({ status: 'DELIVERED', netContribution: 58000, totalAmount: 50000 }));
    expect(ticket).toContain('Total cotise (net):');
    expect(ticket).toContain('Total utilise:');
    expect(ticket).toContain('TOTAL RESTANT:');
  });

  it('keeps the plain total when the member balance is unknown', () => {
    const ticket = html(order());
    expect(ticket).toContain('TOTAL:');
    expect(ticket).not.toContain('Solde net');
  });
});
