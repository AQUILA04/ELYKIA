import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionDetailsComponent } from './gestion-details.component';

describe('GestionDetailsComponent', () => {
  let component: GestionDetailsComponent;
  let fixture: ComponentFixture<GestionDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GestionDetailsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
