import { TestBed } from '@angular/core/testing';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

import { AlertService } from './alert.service';
import { SessionExpiryState } from './session-expiry.state';

describe('AlertService', () => {
  let service: AlertService;
  let sessionExpiry: SessionExpiryState;
  let toastr: jasmine.SpyObj<ToastrService>;

  beforeEach(() => {
    toastr = jasmine.createSpyObj('ToastrService', ['error', 'success', 'warning']);
    TestBed.configureTestingModule({
      providers: [{ provide: ToastrService, useValue: toastr }]
    });
    service = TestBed.inject(AlertService);
    sessionExpiry = TestBed.inject(SessionExpiryState);
    sessionExpiry.end();
  });

  afterEach(() => {
    sessionExpiry.end();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('does not open an error dialog while the session is closing', () => {
    spyOn(Swal, 'fire');
    sessionExpiry.begin();
    service.showError(
      'Full authentication is required to access this resource',
      'Authentification Requise'
    );
    expect(Swal.fire).not.toHaveBeenCalled();
  });

  it('shows one session-expired notice and closes any open dialog', () => {
    spyOn(Swal, 'close');
    service.notifySessionExpired();
    expect(Swal.close).toHaveBeenCalled();
    expect(toastr.error).toHaveBeenCalledWith(
      'Votre session a expiré. Veuillez vous reconnecter.',
      'Session expirée'
    );
  });
});
