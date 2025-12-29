import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocalityListComponent } from './localitylist.component';

describe('LocalityListComponent', () => {
  let component: LocalityListComponent;
  let fixture: ComponentFixture<LocalityListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LocalityListComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(LocalityListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
