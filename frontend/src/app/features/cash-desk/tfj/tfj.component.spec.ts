import { of } from 'rxjs';
import { FormBuilder } from '@angular/forms';
import { vi } from 'vitest';
import { TFJComponent } from './tfj.component';
import { UnifiedRecoveryBatchDto } from '../default-daily-stake-dto';

describe('TFJComponent (unified recovery batch)', () => {
  let component: TFJComponent;
  let cashDeskService: any;
  let spinner: any;
  let tokenStorage: any;
  let router: any;
  let alertService: any;

  beforeEach(() => {
    cashDeskService = {
      getAllCreditsByCollectorV2: vi.fn().mockReturnValue(of({})),
      submitUnifiedRecoveries: vi.fn().mockReturnValue(of({ data: { successRecoveryIds: ['r1', 'r2'], failedRecoveries: [] } })),
      submitOperations: vi.fn(),
      submitSpecialDailyStake: vi.fn(),
      submitTicketing: vi.fn().mockReturnValue(of({ data: { systemBalance: 2000, realBalance: 2000, status: 'OK' } })),
      closeCashDesk: vi.fn().mockReturnValue(of({}))
    };
    spinner = { show: vi.fn(), hide: vi.fn() };
    tokenStorage = { checkConnectedUser: vi.fn() };
    router = { navigate: vi.fn() };
    alertService = { showError: vi.fn(), showDefaultSucces: vi.fn() };

    component = new TFJComponent(
      cashDeskService,
      new FormBuilder(),
      spinner,
      tokenStorage,
      router,
      alertService
    );
    component.collector = 'COM001';
    component.stepper = { next: vi.fn() } as any;
  });

  it('submits normal (1x) and special (>1x) stakes in a single unified batch followed by ticketing', () => {
    component.groupedData = component.createGroupedData({
      'Tokoin': [
        { id: 101, dailyStake: 500, totalAmountRemaining: 2000, client: { id: 1, firstname: 'Afi', lastname: 'K.' } },
        { id: 102, dailyStake: 500, totalAmountRemaining: 3000, client: { id: 2, firstname: 'Kofi', lastname: 'M.' } }
      ]
    });
    component.filteredGroupedData = [...component.groupedData];

    component.setMultiplier(component.filteredGroupedData[0].credits[0], 1, 0);
    component.setMultiplier(component.filteredGroupedData[0].credits[1], 3, 0);

    expect(component.getNormalStakeCount()).toBe(1);
    expect(component.getSpecialStakeCount()).toBe(1);

    component.onSubmitUnifiedStep();
    component.onSubmitStep2({ totalAmount: 2000, ticketingData: { '1000': 2 } });

    expect(cashDeskService.submitOperations).not.toHaveBeenCalled();
    expect(cashDeskService.submitSpecialDailyStake).not.toHaveBeenCalled();
    expect(cashDeskService.submitUnifiedRecoveries).toHaveBeenCalledTimes(1);
    expect(cashDeskService.submitTicketing).toHaveBeenCalledTimes(1);

    const sentDto: UnifiedRecoveryBatchDto = cashDeskService.submitUnifiedRecoveries.mock.calls[0][0];
    expect(sentDto.collector).toBe('COM001');
    expect(sentDto.source).toBe('WEB_TFJ_BATCH');
    expect(sentDto.recoveries.length).toBe(2);
    expect(sentDto.recoveries[0]).toMatchObject({ creditId: 101, clientId: 1, amount: 500 });
    expect(sentDto.recoveries[1]).toMatchObject({ creditId: 102, clientId: 2, amount: 1500 });
    expect(sentDto.recoveries[0].recoveryId).toMatch(/^TFJ-101-/);
    expect(sentDto.recoveries[1].recoveryId).toMatch(/^TFJ-102-/);

    expect(component.systemBalance).toBe(2000);
    expect(component.realBalance).toBe(2000);
    expect(component.status).toBe('OK');
    expect(spinner.hide).toHaveBeenCalled();
  });
});
