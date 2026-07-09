import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TontineMonthlyPillsComponent } from './tontine-monthly-pills.component';

describe('TontineMonthlyPillsComponent', () => {
  let fixture: ComponentFixture<TontineMonthlyPillsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TontineMonthlyPillsComponent] }).compileComponents();
    fixture = TestBed.createComponent(TontineMonthlyPillsComponent);
  });

  it('builds numbered pills from equivalentDays', () => {
    fixture.componentInstance.summaries = [
      {
        month: 'Mars',
        year: 2026,
        count: 2,
        totalAmount: 3000,
        equivalentDays: 3,
        isFuture: false,
        isCurrent: false,
      },
    ];
    fixture.componentInstance.ngOnChanges();
    expect(fixture.componentInstance.rows[0].pillNumbers).toEqual([1, 2, 3]);
  });
});
