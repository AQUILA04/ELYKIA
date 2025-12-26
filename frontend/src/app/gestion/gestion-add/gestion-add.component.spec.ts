import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionAddComponent } from './gestion-add.component';

describe('GestionAddComponent', () => {
  let component: GestionAddComponent;
  let fixture: ComponentFixture<GestionAddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GestionAddComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
