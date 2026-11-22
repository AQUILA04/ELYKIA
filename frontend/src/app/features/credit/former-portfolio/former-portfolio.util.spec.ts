import { buildMonthPills, readSpringPage } from './former-portfolio.util';

describe('readSpringPage', () => {
  it('reads the count nested under page when the root total is absent', () => {
    const page = readSpringPage(
      {
        content: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
        page: { totalElements: 4, totalPages: 1, number: 0, size: 20 }
      },
      0,
      20
    );

    expect(page.totalElements).toBe(4);
    expect(page.totalPages).toBe(1);
    expect(page.content.length).toBe(4);
  });

  it('keeps a root total when the payload has no page object', () => {
    const page = readSpringPage({ content: [{ id: 1 }], totalElements: 25, totalPages: 2, number: 0, size: 20 }, 0, 20);

    expect(page.totalElements).toBe(25);
    expect(page.totalPages).toBe(2);
  });
});

describe('buildMonthPills', () => {
  it('numbers one pill per full day of the stake in force, newest month first', () => {
    const months = buildMonthPills(
      [
        { amount: 600, collectionDate: '2026-08-06T18:49:00' },
        { amount: 900, collectionDate: '2026-08-05T18:42:00' },
        { amount: 4000, collectionDate: '2026-07-31T00:00:00' }
      ],
      [],
      300
    );

    expect(months.map(month => month.label)).toEqual(['Août 2026', 'Juillet 2026']);
    expect(months[0].days).toEqual([1, 2, 3, 4, 5]);
    expect(months[0].stakeLabel).toContain('300');
    expect(months[1].days).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(months[1].amount).toBe(4000);
  });

  it('uses the stake period in force on the collection date', () => {
    const months = buildMonthPills(
      [{ amount: 1000, collectionDate: '2026-08-05T18:42:00' }],
      [{ amount: 500, startDate: '2026-08-01', endDate: '2026-08-31' }],
      300
    );

    expect(months[0].days).toEqual([1, 2]);
    expect(months[0].stakeLabel).toContain('500');
  });

  it('omits a single stake label when the month mixes several mises', () => {
    const months = buildMonthPills(
      [
        { amount: 300, collectionDate: '2026-07-02T10:00:00' },
        { amount: 500, collectionDate: '2026-07-20T10:00:00' }
      ],
      [
        { amount: 300, startDate: '2026-07-01', endDate: '2026-07-10' },
        { amount: 500, startDate: '2026-07-11', endDate: null }
      ],
      300
    );

    expect(months[0].days).toEqual([1, 2]);
    expect(months[0].stakeLabel).toBeNull();
  });
});
