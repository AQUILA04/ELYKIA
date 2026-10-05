import { parseCustomerTerms } from './customer-terms';

describe('parseCustomerTerms', () => {
  const sections = parseCustomerTerms();

  it('keeps each heading with its paragraph', () => {
    expect(sections.length).toBe(15);
    expect(sections[0]).toEqual(jasmine.objectContaining({ title: 'Objet' }));
    expect(sections.map((section) => section.title)).toContain('Paiement des échéances');
    expect(sections.map((section) => section.title)).toContain('Préjudice financier');
  });

  it('keeps the payment and damage commitments in the paragraphs', () => {
    const text = sections.map((section) => section.body).join(' ');
    expect(text).toContain('payer régulièrement chaque échéance');
    expect(text).toContain('ne pas causer de dommage financier');
  });
});
