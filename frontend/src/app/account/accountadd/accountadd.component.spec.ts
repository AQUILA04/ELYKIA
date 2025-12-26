import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAddComponent } from './accountadd.component';

describe('AccountaddComponent', () => {
  let component: AccountAddComponent;
  let fixture: ComponentFixture<AccountAddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountAddComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
