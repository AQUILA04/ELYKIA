import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocalityAddComponent } from './localityadd.component';

describe('LocalityaddComponent', () => {
  let component: LocalityAddComponent;
  let fixture: ComponentFixture<LocalityAddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LocalityAddComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocalityAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
