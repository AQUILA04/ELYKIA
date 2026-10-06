import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AccountDeletionPage } from './account-deletion.page';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
import { UserJournalService } from '../../core/telemetry/user-journal.service';

describe('AccountDeletionPage', () => {
  let fixture: ComponentFixture<AccountDeletionPage>;
  let session: CustomerSessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), AccountDeletionPage],
      providers: [
        provideRouter([]),
        CustomerSessionService,
        {
          provide: UserJournalService,
          useValue: jasmine.createSpyObj('UserJournalService', [
            'track', 'bindUser', 'unbindUser', 'flush', 'init',
          ]),
        },
      ],
    }).compileComponents();

    session = TestBed.inject(CustomerSessionService);
    fixture = TestBed.createComponent(AccountDeletionPage);
    fixture.detectChanges();
  });

  it('shows the deletion request instructions and support address', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Demander la suppression du compte');
    expect(text).toContain('support@optimizesolux.com');
    expect(text).toContain('30 jours');
  });

  it('builds a mailto link with a ready-to-send message', () => {
    const href = fixture.componentInstance.mailtoHref;
    expect(href.startsWith('mailto:support@optimizesolux.com')).toBeTrue();
    expect(href).toContain(encodeURIComponent('Demande de suppression de compte Elykia'));
    const button = fixture.nativeElement.querySelector('[data-testid="e2e-account-deletion-mailto"]');
    expect(button).toBeTruthy();
  });

  it('prefills phone and name when a session exists', () => {
    session.saveSession({
      token: 't',
      clientId: '1',
      fullName: 'Ada Lovelace',
      phone: '90123456',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      isAuthenticated: true,
    });
    const href = fixture.componentInstance.mailtoHref;
    expect(decodeURIComponent(href)).toContain('90123456');
    expect(decodeURIComponent(href)).toContain('Ada Lovelace');
  });

  it('returns to profile when the user is signed in', () => {
    session.saveSession({
      token: 't',
      clientId: '1',
      fullName: 'Ada Lovelace',
      phone: '90123456',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      isAuthenticated: true,
    });
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    fixture.componentInstance.goBack();
    expect(router.navigate).toHaveBeenCalledWith(['/profile']);
  });
});
