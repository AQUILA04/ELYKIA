import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService, ActiveToast } from 'ngx-toastr';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { AppNotificationService } from './app-notification.service';
import { TokenStorageService } from './token-storage.service';

const SESSION_KEY = 'pending-ops-toast-shown';
const TOAST_MS = 5 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class PendingOpsToastService {
  private activeToast?: ActiveToast<any>;

  constructor(
    private toastr: ToastrService,
    private userService: UserService,
    private notificationService: AppNotificationService,
    private router: Router,
    private tokenStorage: TokenStorageService
  ) {}

  maybeShowAfterLogin(retries = 3): void {
    if (!this.isAudience()) {
      return;
    }
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      return;
    }
    if (!this.tokenStorage.getToken()) {
      if (retries > 0) {
        setTimeout(() => this.maybeShowAfterLogin(retries - 1), 300);
      }
      return;
    }
    this.notificationService.unreadCountForToast().subscribe({
      next: (count) => {
        if (count <= 0) {
          return;
        }
        sessionStorage.setItem(SESSION_KEY, '1');
        this.activeToast = this.toastr.info(
          'Vous avez des opérations en attente de validation. Cliquez pour les consulter.',
          'Notifications',
          {
            timeOut: TOAST_MS,
            extendedTimeOut: 0,
            closeButton: true,
            tapToDismiss: true,
            positionClass: 'toast-bottom-right',
            disableTimeOut: false,
            newestOnTop: true
          }
        );
        this.activeToast.onTap.subscribe(() => {
          void this.router.navigate(['/notifications']);
        });
      },
      error: () => { /* ignore toast errors */ }
    });
  }

  clearSessionFlag(): void {
    sessionStorage.removeItem(SESSION_KEY);
    if (this.activeToast) {
      this.toastr.clear(this.activeToast.toastId);
      this.activeToast = undefined;
    }
  }

  private isAudience(): boolean {
    return this.userService.hasProfile(UserProfile.SECRETARY)
      || this.userService.hasProfile(UserProfile.GESTIONNAIRE)
      || this.userService.hasProfile(UserProfile.ADMIN)
      || this.userService.hasProfile(UserProfile.PROMOTER);
  }
}
