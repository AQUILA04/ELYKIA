import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommercialListComponent } from './commercial-list.component';

describe('CommercialListComponent', () => {
  let component: CommercialListComponent;
  let fixture: ComponentFixture<CommercialListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CommercialListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommercialListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
