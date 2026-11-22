import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountModule } from '../account.module';
import { AccountAddComponent } from './accountadd.component';

describe('AccountaddComponent', () => {
  let component: AccountAddComponent;
  let fixture: ComponentFixture<AccountAddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountModule]
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
