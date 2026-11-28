import {
  TontineMemberAllocationStatus,
  applySocietyShareOverride,
  societyShareIncreaseOf
} from './tontine-calculation.service';
import { offlineSocietyShareResult } from './rm/rm-pack-society-share-mutation.util';
import { availableAfterSocietyShare } from '../../shared/components/tontine-society-share-modal/tontine-society-share-modal.component';
import { societyShareModeOf } from '../../models/tontine.model';

function status(totalCollected: number, societyShare: number): TontineMemberAllocationStatus {
  return {
    version: 'V3',
    totalCollected,
    societyShare,
    availableBudget: Math.max(0, totalCollected - societyShare),
    validatedMonths: 0,
    currentMonthDays: 0,
    monthsStarted: 0,
    targetSocietyShare: 0,
    isOfflineEstimate: false,
    isExact: true,
    collections: []
  };
}

describe('applySocietyShareOverride (même règle que le serveur)', () => {
  it('keeps the computed share when nothing was entered', () => {
    const s = status(10000, 1000);
    applySocietyShareOverride(s, null);
    expect(s.societyShare).toBe(1000);
    expect(s.availableBudget).toBe(9000);
    expect(s.computedSocietyShare).toBe(1000);
    expect(societyShareIncreaseOf(s)).toBe(0);
  });

  it('replaces the share and the available balance with the entered amount', () => {
    const s = status(10000, 1000);
    applySocietyShareOverride(s, 3000);
    expect(s.societyShare).toBe(3000);
    expect(s.availableBudget).toBe(7000);
    expect(s.computedSocietyShare).toBe(1000);
    expect(societyShareIncreaseOf(s)).toBe(2000);
  });

  it('caps the entered amount at the regular contributions', () => {
    const s = status(10000, 1000);
    applySocietyShareOverride(s, 50000);
    expect(s.societyShare).toBe(10000);
    expect(s.availableBudget).toBe(0);
  });

  it('does not apply an adjustment without collections', () => {
    const s = status(0, 0);
    applySocietyShareOverride(s, 3000);
    expect(s.societyShare).toBe(0);
    expect(s.availableBudget).toBe(0);
  });

  it('never raises the ceiling when the share goes down', () => {
    const s = status(10000, 3000);
    applySocietyShareOverride(s, 1000);
    expect(s.availableBudget).toBe(9000);
    expect(societyShareIncreaseOf(s)).toBe(0);
  });
});

describe('offlineSocietyShareResult (chef de recouvrement hors ligne)', () => {
  it('validates when the amount equals the current share', () => {
    const result = offlineSocietyShareResult(5000, 5000.4);
    expect(result.outcome).toBe('VALIDATED');
    expect(result.memberSocietyShareStatus).toBe('CONFIRMED');
    expect(result.memberSocietyShare).toBe(5000);
    expect(result.memberSocietyShareLocked).toBeTrue();
  });

  it('corrects when the amount differs', () => {
    const result = offlineSocietyShareResult(5000, 7000);
    expect(result.outcome).toBe('ADJUSTED');
    expect(result.memberSocietyShare).toBe(7000);
    expect(result.memberSocietyShareStatus).toBe('ADJUSTED');
  });
});

describe('availableAfterSocietyShare (formulaire de réajustement)', () => {
  const data = { regularContribution: 10000, systemSocietyShare: 1000, currentSocietyShare: 1000, currentAvailable: 9500 };

  it('recomputes the available balance from the entered share', () => {
    expect(availableAfterSocietyShare(data, 3000)).toBe(7500);
    expect(availableAfterSocietyShare(data, 500)).toBe(10000);
  });

  it('caps the entered share at the regular contributions', () => {
    expect(availableAfterSocietyShare(data, 50000)).toBe(500);
  });
});

describe('societyShareModeOf', () => {
  it('defaults to DISABLED', () => {
    expect(societyShareModeOf(null)).toBe('DISABLED');
    expect(societyShareModeOf({ societyShareAdjustmentMode: 'mandatory' })).toBe('MANDATORY');
    expect(societyShareModeOf({ societyShareAdjustmentMode: 'OPTIONAL' })).toBe('OPTIONAL');
  });
});
