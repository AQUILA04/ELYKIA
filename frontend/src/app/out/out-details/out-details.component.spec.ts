import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OutDetailsComponent } from './out-details.component';

describe('OutDetailsComponent', () => {
  let component: OutDetailsComponent;
  let fixture: ComponentFixture<OutDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OutDetailsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OutDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
