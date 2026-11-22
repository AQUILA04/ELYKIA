import { CockpitTotals, CommercialReconciliationLine, countByStatus, encashmentShares, variationPercent } from './commercial-cockpit.model';

describe('commercial-cockpit.model', () => {
    it('computes a variation only when the reference is not zero', () => {
        expect(variationPercent(112, 100)).toBeCloseTo(12);
        expect(variationPercent(50, 100)).toBeCloseTo(-50);
        expect(variationPercent(50, 0)).toBeNull();
        expect(variationPercent(50, null)).toBeNull();
    });

    it('counts commercials by status', () => {
        const lines = ['LATE', 'SURPLUS', 'UP_TO_DATE', 'UP_TO_DATE']
            .map(status => ({ status } as CommercialReconciliationLine));
        expect(countByStatus(lines)).toEqual({ LATE: 1, SURPLUS: 1, UP_TO_DATE: 2, INACTIVE: 0 });
    });

    it('splits the amount due by origin', () => {
        const shares = encashmentShares({
            creditCollected: 26450, tontineCollected: 107600, newBalance: 0, catchupEntered: 13300
        } as CockpitTotals);
        expect(shares.credit + shares.tontine + shares.newBalance + shares.catchup).toBeCloseTo(100);
        expect(shares.catchup).toBeCloseTo(9.03, 1);
        expect(encashmentShares({ creditCollected: 0, tontineCollected: 0, newBalance: 0, catchupEntered: 0 } as CockpitTotals))
            .toEqual({ credit: 0, tontine: 0, newBalance: 0, catchup: 0 });
    });
});
