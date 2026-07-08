import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ProfilePage } from './profile.page';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  let session: CustomerSessionService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePage, IonicModule.forRoot(), RouterTestingModule],
      providers: [CustomerSessionService],
    }).compileComponents();
    session = TestBed.inject(CustomerSessionService);
    router = TestBed.inject(Router);
    spyOn(session, 'clearSession');
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    fixture = TestBed.createComponent(ProfilePage);
  });

  it('logs out and redirects to auth', () => {
    fixture.componentInstance.logout();
    expect(session.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth'], { replaceUrl: true });
  });
});
