import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReactivateLicenseComponent } from './reactivate-license.component';

describe('ReactivateLicenseComponent', () => {
  let component: ReactivateLicenseComponent;
  let fixture: ComponentFixture<ReactivateLicenseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReactivateLicenseComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReactivateLicenseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
