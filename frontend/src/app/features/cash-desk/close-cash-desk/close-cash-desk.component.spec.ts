import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CloseCashDeskComponent } from './close-cash-desk.component';

describe('CloseCashDeskComponent', () => {
  let component: CloseCashDeskComponent;
  let fixture: ComponentFixture<CloseCashDeskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CloseCashDeskComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CloseCashDeskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
