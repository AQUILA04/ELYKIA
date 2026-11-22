import type { MockedObject } from "vitest";
import { RmMonthlyRecoveryRateApiService } from './rm-monthly-recovery-rate-api.service';
import { RmMonthlyRecoveryRateService } from './rm-monthly-recovery-rate.service';
import { MonthlyRecoveryRate } from './rm.models';

describe('RmMonthlyRecoveryRateService', () => {
    let service: RmMonthlyRecoveryRateService;
    let api: MockedObject<RmMonthlyRecoveryRateApiService>;
    let connectivity: MockedObject<{
        checkBackendReachable: () => Promise<boolean>;
    }>;
    let storage: MockedObject<{
        create: () => Promise<void>;
        get: (k: string) => Promise<any>;
        set: (k: string, v: any) => Promise<void>;
    }>;

    const sample: MonthlyRecoveryRate = {
        year: 2026,
        month: 9,
        amountCollectedByChef: 250000,
        latePortfolioDue: 1000000,
        lateCreditsCount: 10,
        operationsCount: 4,
        recoveryRatePercent: 25
    };

    beforeEach(() => {
        api = {
            getMonthlyRecoveryRate: vi.fn().mockName("RmMonthlyRecoveryRateApiService.getMonthlyRecoveryRate")
        } as unknown as MockedObject<RmMonthlyRecoveryRateApiService>;
        connectivity = {
            checkBackendReachable: vi.fn().mockName("ConnectivityService.checkBackendReachable")
        };
        storage = {
            create: vi.fn().mockName("Storage.create"),
            get: vi.fn().mockName("Storage.get"),
            set: vi.fn().mockName("Storage.set")
        };
        storage.create.mockResolvedValue(undefined);
        storage.get.mockResolvedValue(null);
        storage.set.mockResolvedValue(undefined);

        service = new RmMonthlyRecoveryRateService(storage as any, api, connectivity as any);
    });

    it('loads from API when online and caches the result', async () => {
        connectivity.checkBackendReachable.mockResolvedValue(true);
        api.getMonthlyRecoveryRate.mockResolvedValue(sample);

        const result = await service.load(2026, 9);

        expect(result).toEqual(sample);
        expect(api.getMonthlyRecoveryRate).toHaveBeenCalledWith(2026, 9);
        expect(storage.set).toHaveBeenCalled();
        expect(service.getCurrent()).toEqual(sample);
    });

    it('keeps cache and marks offline when backend unreachable', async () => {
        storage.get.mockResolvedValue(sample);
        await (service as any).ready;
        (service as any).rateSubject.next(sample);

        connectivity.checkBackendReachable.mockResolvedValue(false);

        const result = await service.load(2026, 9);

        expect(result).toEqual(sample);
        expect(api.getMonthlyRecoveryRate).not.toHaveBeenCalled();
    });
});
