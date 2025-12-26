import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocalitylistComponent } from './localitylist.component';

describe('LocalitylistComponent', () => {
  let component: LocalitylistComponent;
  let fixture: ComponentFixture<LocalitylistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LocalitylistComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocalitylistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
