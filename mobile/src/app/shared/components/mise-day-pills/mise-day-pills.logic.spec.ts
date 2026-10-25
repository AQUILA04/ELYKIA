import {
  canShowExtend,
  extendedMaxDays,
  fitNotebookDays,
  maxDaysAfterSelection,
  misesTotal,
  MISE_DAY_STEP,
  nextReducedMaxDays
} from './mise-day-pills.logic';

describe('mise-day-pills.logic', () => {
  it('starts at 31 days and grows by blocks of 31', () => {
    expect(extendedMaxDays(15)).toBe(31);
    expect(extendedMaxDays(31)).toBe(31);
    expect(extendedMaxDays(32)).toBe(62);
    expect(extendedMaxDays(62)).toBe(62);
    expect(extendedMaxDays(63)).toBe(93);
    expect(extendedMaxDays(10, 62)).toBe(62);
  });

  it('fits an exact number of days after removing the advance', () => {
    const fit = fitNotebookDays(15 * 500 + 2000, 2000, 500);
    expect(fit.exact).toBe(true);
    expect(fit.days).toBe(15);
    expect(fit.maxDays).toBe(MISE_DAY_STEP);
  });

  it('extends the grid when the fitted day count passes 31', () => {
    const fit = fitNotebookDays(40 * 1000, 0, 1000);
    expect(fit.exact).toBe(true);
    expect(fit.days).toBe(40);
    expect(fit.maxDays).toBe(62);
  });

  it('rejects a remainder that is not a whole number of mises', () => {
    const fit = fitNotebookDays(1500, 0, 1000);
    expect(fit.exact).toBe(false);
    expect(fit.days).toBe(0);
  });

  it('accepts zero days when the notebook equals the advance', () => {
    const fit = fitNotebookDays(2500, 2500, 500);
    expect(fit.exact).toBe(true);
    expect(fit.days).toBe(0);
  });

  it('shows extend only when the last visible day is selected', () => {
    expect(canShowExtend(15, 31)).toBe(false);
    expect(canShowExtend(31, 31)).toBe(true);
    expect(canShowExtend(31, 62)).toBe(false);
    expect(canShowExtend(62, 62)).toBe(true);
  });

  it('reduces one block of 31 when the selection still fits', () => {
    expect(nextReducedMaxDays(31, 62)).toBe(31);
    expect(nextReducedMaxDays(31, 93)).toBe(62);
    expect(nextReducedMaxDays(40, 62)).toBe(null);
    expect(nextReducedMaxDays(15, 31)).toBe(null);
  });

  it('collapses an unused extension when the selection drops below 31', () => {
    expect(maxDaysAfterSelection(15, 62)).toBe(31);
    expect(maxDaysAfterSelection(null, 93)).toBe(31);
    expect(maxDaysAfterSelection(31, 62)).toBe(62);
    expect(maxDaysAfterSelection(40, 62)).toBe(62);
  });

  it('multiplies the selected days by the daily mise', () => {
    expect(misesTotal(15, 400)).toBe(6000);
    expect(misesTotal(0, 400)).toBe(0);
    expect(misesTotal(null, 400)).toBe(0);
  });
});
