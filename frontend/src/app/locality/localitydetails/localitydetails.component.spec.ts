import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocalitydetailsComponent } from './localitydetails.component';

describe('LocalitydetailsComponent', () => {
  let component: LocalitydetailsComponent;
  let fixture: ComponentFixture<LocalitydetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LocalitydetailsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocalitydetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
