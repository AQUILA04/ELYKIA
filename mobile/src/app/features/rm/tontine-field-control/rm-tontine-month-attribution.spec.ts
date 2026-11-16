import {
  canAddExtraCarnetRow,
  canEditMonthAttribution,
  commercialsUsedOnMonth,
  countCalendarMonthRows,
  isExtraCarnetAttribution,
  isMonthCollectedElsewhere,
  MAX_EXTRA_CARNET_ROWS,
  MAX_MONTH_CONTROL_ROWS,
  omitClaimedEmptyMonthRows
} from './rm-tontine-month-attribution';

interface TestRow {
  year: number;
  month: number;
  systemAmount: number;
  label?: string;
  commercialUsername?: string;
  duplicatedFromSystemMonth?: boolean;
}

function row(month: number, systemAmount: number, label?: string): TestRow {
  return {
    year: 2026,
    month,
    systemAmount,
    label,
    commercialUsername: label
  };
}

describe('isMonthCollectedElsewhere', () => {
  it('does not lock a month that already has system amounts on its own block', () => {
    const june = row(6, 5000, 'COM003');
    const all = [june, row(6, 0, 'COM015')];
    expect(isMonthCollectedElsewhere(june, all)).toBeFalse();
  });

  it('locks an empty stub when another commercial already collected that month', () => {
    const emptyOnCom003 = row(3, 0, 'COM003');
    const collectedOnOther = row(3, 6200, 'COM001');
    const all = [emptyOnCom003, collectedOnOther, row(6, 5000, 'COM003')];
    expect(isMonthCollectedElsewhere(emptyOnCom003, all)).toBeTrue();
  });

  it('does not lock an explicit extra-carnet duplicate of a funded month', () => {
    const funded = row(3, 6200, 'COM015');
    const extra = {
      ...row(3, 0, ''),
      duplicatedFromSystemMonth: true,
      commercialUsername: ''
    };
    expect(isMonthCollectedElsewhere(extra, [funded, extra])).toBeFalse();
  });

  it('keeps truly empty months selectable even between collected months', () => {
    // COM003: juin/juillet cotisés ; fév et août à 0 partout → pas de verrou.
    const feb = row(2, 0, 'COM003');
    const mar = row(3, 0, 'COM003');
    const apr = row(4, 0, 'COM003');
    const may = row(5, 0, 'COM003');
    const jun = row(6, 5000, 'COM003');
    const jul = row(7, 3000, 'COM003');
    const aug = row(8, 0, 'COM003');
    const all = [feb, mar, apr, may, jun, jul, aug];

    expect(isMonthCollectedElsewhere(feb, all)).toBeFalse();
    expect(isMonthCollectedElsewhere(mar, all)).toBeFalse();
    expect(isMonthCollectedElsewhere(apr, all)).toBeFalse();
    expect(isMonthCollectedElsewhere(may, all)).toBeFalse();
    expect(isMonthCollectedElsewhere(aug, all)).toBeFalse();
  });

  it('coerces string year/month/amount from JSON packs', () => {
    const empty = { year: '2026' as unknown as number, month: '3' as unknown as number, systemAmount: 0 };
    const collected = {
      year: '2026' as unknown as number,
      month: '3' as unknown as number,
      systemAmount: '1500' as unknown as number
    };
    expect(isMonthCollectedElsewhere(empty, [empty, collected])).toBeTrue();
  });
});

describe('canEditMonthAttribution', () => {
  it('allows commercial + mise on each eligible empty month independently', () => {
    const feb = row(2, 0);
    const mar = row(3, 9300); // déjà cotisé
    const apr = row(4, 0);
    const all = [feb, mar, apr];

    expect(canEditMonthAttribution(feb, all)).toBeTrue();
    expect(canEditMonthAttribution(mar, all)).toBeFalse();
    expect(canEditMonthAttribution(apr, all)).toBeTrue();
  });

  it('refuses reassignment when the empty stub is claimed elsewhere', () => {
    const emptyStub = row(3, 0, 'COM003');
    const claimed = row(3, 2000, 'COM015');
    expect(canEditMonthAttribution(emptyStub, [emptyStub, claimed])).toBeFalse();
  });

  it('refuses mise edit on an extra-carnet duplicate (mise locked to source)', () => {
    const funded = row(3, 6200, 'COM015');
    const extra = { ...row(3, 0, 'COM003'), duplicatedFromSystemMonth: true };
    expect(canEditMonthAttribution(extra, [funded, extra])).toBeFalse();
    expect(isExtraCarnetAttribution(extra)).toBeTrue();
  });
});

describe('canAddExtraCarnetRow / countCalendarMonthRows', () => {
  it('shows + only when the source month has systemAmount > 0', () => {
    const empty = row(2, 0, 'COM003');
    const funded = row(3, 6200, 'COM015');
    expect(canAddExtraCarnetRow(empty, [empty, funded])).toBeFalse();
    expect(canAddExtraCarnetRow(funded, [empty, funded])).toBeTrue();
  });

  it('allows at most 2 duplicates (3 rows total for the calendar month)', () => {
    expect(MAX_EXTRA_CARNET_ROWS).toBe(2);
    expect(MAX_MONTH_CONTROL_ROWS).toBe(3);

    const funded = row(3, 6200, 'COM015');
    const firstExtra = { ...row(3, 0, 'COM003'), duplicatedFromSystemMonth: true };
    const secondExtra = { ...row(3, 0, 'COM001'), duplicatedFromSystemMonth: true };
    const all = [funded, firstExtra, secondExtra];

    expect(countCalendarMonthRows(2026, 3, [funded])).toBe(1);
    expect(canAddExtraCarnetRow(funded, [funded])).toBeTrue();
    expect(canAddExtraCarnetRow(funded, [funded, firstExtra])).toBeTrue();
    expect(canAddExtraCarnetRow(funded, all)).toBeFalse();
    expect(countCalendarMonthRows(2026, 3, all)).toBe(3);
  });

  it('does not offer + on an already duplicated extra row', () => {
    const funded = row(3, 6200, 'COM015');
    const extra = { ...row(3, 0, 'COM003'), duplicatedFromSystemMonth: true };
    expect(canAddExtraCarnetRow(extra, [funded, extra])).toBeFalse();
  });
});

describe('commercialsUsedOnMonth', () => {
  it('lists commercials already assigned on the same year-month excluding current row', () => {
    const funded = row(3, 6200, 'COM015');
    const extra = { ...row(3, 0, 'COM003'), duplicatedFromSystemMonth: true };
    const picking = { ...row(3, 0, ''), duplicatedFromSystemMonth: true, commercialUsername: '' };

    expect(commercialsUsedOnMonth(picking, [funded, extra, picking])).toEqual(['COM015', 'COM003']);
    expect(commercialsUsedOnMonth(extra, [funded, extra])).toEqual(['COM015']);
  });
});

describe('omitClaimedEmptyMonthRows', () => {
  it('removes grey Système-0 stubs for months already collected on another block', () => {
    const comPrev = {
      rows: [row(3, 2000), row(4, 2000), row(5, 2000), row(6, 0), row(7, 0)]
    };
    const com003 = {
      rows: [
        row(2, 0),
        row(3, 0),
        row(4, 0),
        row(5, 0),
        row(6, 5000),
        row(7, 3000),
        row(8, 0)
      ]
    };

    omitClaimedEmptyMonthRows([comPrev, com003]);

    expect(com003.rows.map(r => r.month)).toEqual([2, 6, 7, 8]);
    expect(comPrev.rows.map(r => r.month)).toEqual([3, 4, 5]);
  });

  it('keeps every empty month when nobody collected them', () => {
    const only = {
      rows: [row(2, 0), row(3, 0), row(6, 5000), row(7, 3000), row(8, 0)]
    };
    omitClaimedEmptyMonthRows([only]);
    expect(only.rows.map(r => r.month)).toEqual([2, 3, 6, 7, 8]);
  });

  it('keeps explicit extra-carnet duplicates even when system is 0', () => {
    const block = {
      rows: [
        row(3, 6200, 'COM015'),
        { ...row(3, 0, 'COM003'), duplicatedFromSystemMonth: true }
      ]
    };
    omitClaimedEmptyMonthRows([block]);
    expect(block.rows.length).toBe(2);
    expect(block.rows[1].duplicatedFromSystemMonth).toBeTrue();
  });
});
