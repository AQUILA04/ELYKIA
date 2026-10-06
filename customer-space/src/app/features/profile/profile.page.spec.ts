import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ProfilePage } from './profile.page';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
import { AppUpdateService } from '../../shared/services/app-update.service';
import { CustomerNotificationInboxService } from '../../shared/services/customer-notification-inbox.service';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { environment } from '../../../environments/environment';

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  let session: CustomerSessionService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePage, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        CustomerSessionService,
        {
          provide: AppUpdateService,
          useValue: jasmine.createSpyObj('AppUpdateService', ['checkForUpdate', 'downloadAndInstall']),
        },
        {
          provide: AlertController,
          useValue: jasmine.createSpyObj('AlertController', ['create']),
        },
        {
          provide: ToastController,
          useValue: jasmine.createSpyObj('ToastController', ['create']),
        },
        {
          provide: CustomerNotificationInboxService,
          useValue: { unreadCount$: of(0) },
        },
      ],
    }).compileComponents();
    session = TestBed.inject(CustomerSessionService);
    router = TestBed.inject(Router);
    spyOn(session, 'clearSession');
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    fixture = TestBed.createComponent(ProfilePage);
  });

  it('exposes current app version', () => {
    expect(fixture.componentInstance.appVersion).toBe(environment.version);
  });

  it('displays version in template', () => {
    fixture.detectChanges();
    const versionEl = fixture.nativeElement.querySelector('[data-testid="e2e-profile-version"]');
    expect(versionEl?.textContent).toContain(environment.version);
  });

  it('links to privacy and account deletion', () => {
    fixture.detectChanges();
    const privacy = fixture.nativeElement.querySelector('[data-testid="e2e-profile-privacy"]');
    const deletion = fixture.nativeElement.querySelector('[data-testid="e2e-profile-account-deletion"]');
    expect(privacy?.textContent).toContain('Règles de confidentialité');
    expect(deletion?.textContent).toContain('Demander la suppression du compte');
  });

  it('logs out and redirects to auth', () => {
    fixture.componentInstance.logout();
    expect(session.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth'], { replaceUrl: true });
  });
});
