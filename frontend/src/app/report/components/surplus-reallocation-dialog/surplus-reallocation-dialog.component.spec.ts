import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { CashDepositService } from '../../service/cash-deposit.service';
import { SurplusReallocation } from '../../models/surplus-reallocation.model';
import { SurplusReallocationDialogComponent } from './surplus-reallocation-dialog.component';

describe('SurplusReallocationDialogComponent', () => {
  let fixture: ComponentFixture<SurplusReallocationDialogComponent>;
  let component: SurplusReallocationDialogComponent;
  let service: jasmine.SpyObj<CashDepositService>;

  const preview = {
    surplusBefore: 400,
    totalReallocated: 300,
    surplusRemaining: 100,
    remainingAfter: 500,
    creditAllocated: 300,
    tontineAllocated: 0,
    newBalanceAllocated: 0,
    days: [
      {
        date: '2026-10-01',
        creditGap: 0,
        tontineGap: 0,
        newBalanceGap: 500,
        creditAllocated: 0,
        tontineAllocated: 0,
        newBalanceAllocated: 0,
        priority: false,
        beforePeriod: false
      },
      {
        date: '2026-10-05',
        creditGap: 300,
        tontineGap: 0,
        newBalanceGap: 0,
        creditAllocated: 300,
        tontineAllocated: 0,
        newBalanceAllocated: 0,
        priority: false,
        beforePeriod: true
      }
    ],
    surplusByDay: [{ date: '2026-10-10', surplus: 400 }]
  } as SurplusReallocation;

  beforeEach(async () => {
    service = jasmine.createSpyObj('CashDepositService', ['previewReallocateSurplus', 'reallocateSurplus']);
    service.previewReallocateSurplus.and.returnValue(of(preview));
    service.reallocateSurplus.and.returnValue(of({ ...preview, id: 1, totalReallocated: 300 }));

    await TestBed.configureTestingModule({
      declarations: [SurplusReallocationDialogComponent],
      imports: [CommonModule, FormsModule],
      providers: [
        { provide: CashDepositService, useValue: service },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { commercialUsername: 'COM007', startDate: '2026-10-01', endDate: '2026-10-10' }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SurplusReallocationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('opens with soldes unchecked and previews the whole period', () => {
    expect(component.includeNewBalance).toBeFalse();
    expect(service.previewReallocateSurplus).toHaveBeenCalledWith(
      'COM007',
      '2026-10-01',
      '2026-10-10',
      { includeNewBalance: false, priorityDates: [] }
    );
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Utiliser le surplus pour les soldes des nouveaux comptes');
    expect(text).toContain('10/10/2026');
    expect(text).toContain('Avant la période');
    const checkbox = fixture.nativeElement.querySelector('input[name="includeNewBalance"]') as HTMLInputElement;
    expect(checkbox.checked).toBeFalse();
  });

  it('reloads when soldes and a priority day change', () => {
    component.includeNewBalance = true;
    component.onIncludeNewBalanceChange();
    component.togglePriority(component.days[0], true);

    expect(service.previewReallocateSurplus.calls.mostRecent().args).toEqual([
      'COM007',
      '2026-10-01',
      '2026-10-10',
      { includeNewBalance: true, priorityDates: ['2026-10-01'] }
    ]);
  });

  it('confirms with the same choices', () => {
    component.togglePriority(component.days[1], true);
    component.confirm();

    expect(service.reallocateSurplus).toHaveBeenCalledWith(
      'COM007',
      '2026-10-01',
      '2026-10-10',
      { includeNewBalance: false, priorityDates: ['2026-10-05'] }
    );
  });
});
