import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenCashDeskComponent } from './open-cash-desk.component';

describe('OpenCashDeskComponent', () => {
  let component: OpenCashDeskComponent;
  let fixture: ComponentFixture<OpenCashDeskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OpenCashDeskComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpenCashDeskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
