import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepositAddComponent } from './deposit-add.component';

describe('DepositAddComponent', () => {
  let component: DepositAddComponent;
  let fixture: ComponentFixture<DepositAddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DepositAddComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DepositAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
