import { RmMonthlyRecoveryRateApiService } from './rm-monthly-recovery-rate-api.service';
import { RmMonthlyRecoveryRateService } from './rm-monthly-recovery-rate.service';
import { MonthlyRecoveryRate } from './rm.models';

describe('RmMonthlyRecoveryRateService', () => {
  let service: RmMonthlyRecoveryRateService;
  let api: jasmine.SpyObj<RmMonthlyRecoveryRateApiService>;
  let connectivity: jasmine.SpyObj<{ checkBackendReachable: () => Promise<boolean> }>;
  let storage: jasmine.SpyObj<{ create: () => Promise<void>; get: (k: string) => Promise<any>; set: (k: string, v: any) => Promise<void> }>;

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
    api = jasmine.createSpyObj('RmMonthlyRecoveryRateApiService', ['getMonthlyRecoveryRate']);
    connectivity = jasmine.createSpyObj('ConnectivityService', ['checkBackendReachable']);
    storage = jasmine.createSpyObj('Storage', ['create', 'get', 'set']);
    storage.create.and.resolveTo(undefined);
    storage.get.and.resolveTo(null);
    storage.set.and.resolveTo(undefined);

    service = new RmMonthlyRecoveryRateService(
      storage as any,
      api,
      connectivity as any
    );
  });

  it('loads from API when online and caches the result', async () => {
    connectivity.checkBackendReachable.and.resolveTo(true);
    api.getMonthlyRecoveryRate.and.resolveTo(sample);

    const result = await service.load(2026, 9);

    expect(result).toEqual(sample);
    expect(api.getMonthlyRecoveryRate).toHaveBeenCalledWith(2026, 9);
    expect(storage.set).toHaveBeenCalled();
    expect(service.getCurrent()).toEqual(sample);
  });

  it('keeps cache and marks offline when backend unreachable', async () => {
    storage.get.and.resolveTo(sample);
    await (service as any).ready;
    (service as any).rateSubject.next(sample);

    connectivity.checkBackendReachable.and.resolveTo(false);

    const result = await service.load(2026, 9);

    expect(result).toEqual(sample);
    expect(api.getMonthlyRecoveryRate).not.toHaveBeenCalled();
  });
});
