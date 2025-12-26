import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BilletageComponent } from './billetage.component';

describe('BilletageComponent', () => {
  let component: BilletageComponent;
  let fixture: ComponentFixture<BilletageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BilletageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BilletageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
