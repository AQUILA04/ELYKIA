import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OutPdfListComponent } from './out-pdf-list.component';

describe('OutPdfListComponent', () => {
  let component: OutPdfListComponent;
  let fixture: ComponentFixture<OutPdfListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OutPdfListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OutPdfListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
