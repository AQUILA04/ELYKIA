import { TestBed } from '@angular/core/testing';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { of } from 'rxjs';
import { toast } from 'ngx-sonner';

import { AlertService } from './alert.service';
import { SessionExpiryState } from './session-expiry.state';
import {
  AlertDialogComponent,
  AlertDialogResult,
} from '../components/alert-dialog/alert-dialog.component';

describe('AlertService', () => {
  let service: AlertService;
  let sessionExpiry: SessionExpiryState;
  let dialogOpenSpy: ReturnType<typeof vi.fn>;
  let dialogCloseAllSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dialogOpenSpy = vi.fn();
    dialogCloseAllSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Dialog,
          useValue: {
            open: dialogOpenSpy,
            closeAll: dialogCloseAllSpy,
          },
        },
      ],
    });

    service = TestBed.inject(AlertService);
    sessionExpiry = TestBed.inject(SessionExpiryState);
    sessionExpiry.end();
  });

  afterEach(() => {
    sessionExpiry.end();
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('shows quick success toast via ngx-sonner and strips HTML tags', () => {
    const spy = vi.spyOn(toast, 'success').mockReturnValue('1');

    service.showSuccess('Opération OK.<br><b>3</b> éléments traités', 'Succès');

    expect(spy).toHaveBeenCalledWith('Succès', {
      description: 'Opération OK.\n3 éléments traités',
    });
  });

  it('does not show an error toast while the session is closing', () => {
    const spy = vi.spyOn(toast, 'error').mockReturnValue('1');
    sessionExpiry.begin();

    service.showError('Full authentication is required', 'Authentification Requise');

    expect(spy).not.toHaveBeenCalled();
  });

  it('shows one session-expired notice and closes any open CDK dialog', () => {
    const spy = vi.spyOn(toast, 'error').mockReturnValue('1');

    service.notifySessionExpired();

    expect(dialogCloseAllSpy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('Session expirée', {
      description: 'Votre session a expiré. Veuillez vous reconnecter.',
      duration: 6000,
    });
  });

  it('opens AlertDialogComponent for showConfirmation and resolves boolean', async () => {
    dialogOpenSpy.mockReturnValue({
      closed: of({ confirmed: true } satisfies AlertDialogResult),
    } as Partial<DialogRef<AlertDialogResult>>);

    const confirmed = await service.showConfirmation('Confirmer ?', 'Continuer l\'action ?');

    expect(confirmed).toBe(true);
    expect(dialogOpenSpy).toHaveBeenCalledWith(
      AlertDialogComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          mode: 'confirm',
          variant: 'primary',
          title: 'Confirmer ?',
          message: 'Continuer l\'action ?',
          showCancelButton: true,
        }),
      }),
    );
  });

  it('opens danger confirmation dialog for showDeleteConfirmation', async () => {
    dialogOpenSpy.mockReturnValue({
      closed: of(undefined),
    } as Partial<DialogRef<AlertDialogResult>>);

    const confirmed = await service.showDeleteConfirmation('Supprimer cet élément ?');

    expect(confirmed).toBe(false);
    expect(dialogOpenSpy).toHaveBeenCalledWith(
      AlertDialogComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          mode: 'confirm',
          variant: 'danger',
          confirmButtonText: 'Supprimer',
        }),
      }),
    );
  });

  it('opens prompt dialog and returns entered string or null when cancelled', async () => {
    dialogOpenSpy.mockReturnValueOnce({
      closed: of({ confirmed: true, value: 'TempPass123' } satisfies AlertDialogResult),
    } as Partial<DialogRef<AlertDialogResult>>);

    const value = await service.showPrompt({
      title: 'Réinitialiser le mot de passe',
      message: 'Nouveau mot de passe',
      inputType: 'password',
    });
    expect(value).toBe('TempPass123');

    dialogOpenSpy.mockReturnValueOnce({
      closed: of({ confirmed: false } satisfies AlertDialogResult),
    } as Partial<DialogRef<AlertDialogResult>>);

    const cancelled = await service.showPrompt({
      title: 'Réinitialiser le mot de passe',
      message: 'Nouveau mot de passe',
    });
    expect(cancelled).toBeNull();
  });
});
