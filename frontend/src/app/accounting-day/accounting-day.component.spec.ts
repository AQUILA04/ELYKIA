import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountingDayComponent } from './accounting-day.component';

describe('AccountingDayComponent', () => {
  let component: AccountingDayComponent;
  let fixture: ComponentFixture<AccountingDayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountingDayComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountingDayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
