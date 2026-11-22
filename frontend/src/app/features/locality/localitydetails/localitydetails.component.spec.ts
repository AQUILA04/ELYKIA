import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocalityDetailsComponent } from './localitydetails.component';

describe('LocalityDetailsComponent', () => {
  let component: LocalityDetailsComponent;
  let fixture: ComponentFixture<LocalityDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LocalityDetailsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocalityDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
