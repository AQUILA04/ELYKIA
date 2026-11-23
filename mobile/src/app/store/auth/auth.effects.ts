import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, from, firstValueFrom, timeout } from 'rxjs';
import { catchError, map, switchMap, tap, finalize } from 'rxjs/operators';
import * as AuthActions from './auth.actions';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { LoggerService } from '../../core/services/logger.service';
import { canAccessRecoveryManagerMobile } from '../../core/utils/rm-user.util';
import { RmScopeService } from '../../core/services/rm/rm-scope.service';
import { RmCloseQueueService } from '../../core/services/rm/rm-close-queue.service';
import { RmContactQueueService } from '../../core/services/rm/rm-contact-queue.service';
import { RmFieldControlQueueService } from '../../core/services/rm/rm-field-control-queue.service';
import { RmTontineFieldControlQueueService } from '../../core/services/rm/rm-tontine-field-control-queue.service';
import { AppUpdateService } from '../../core/services/app-update.service';
import { DataInitializationService } from '../../core/services/data-initialization.service';
import { RmPendingQueuesService } from '../../core/services/rm/rm-pending-queues.service';

/** Une sauvegarde avant déconnexion ne doit jamais bloquer l'utilisateur plus de 10 s. */
const BACKUP_BEFORE_LOGOUT_TIMEOUT_MS = 10_000;

@Injectable()
export class AuthEffects {
  private loading: HTMLIonLoadingElement | null = null;

  constructor(
    private actions$: Actions,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private log: LoggerService,
    private rmScope: RmScopeService,
    private rmCloseQueue: RmCloseQueueService,
    private rmContactQueue: RmContactQueueService,
    private rmFieldControlQueue: RmFieldControlQueueService,
    private rmTontineFieldControlQueue: RmTontineFieldControlQueueService,
    private appUpdateService: AppUpdateService,
    private dataInitialization: DataInitializationService,
    private rmPending: RmPendingQueuesService
  ) {}

  /**
   * Filet de sécurité : s'il reste des saisies RM non envoyées, on écrit une sauvegarde
   * de la base (Documents/elykia/) avant de fermer la session. Ne lève jamais.
   */
  private async backupBeforeLogout(): Promise<void> {
    try {
      if (!(await this.rmPending.hasPending())) {
        return;
      }
      const saved = await firstValueFrom(
        this.dataInitialization.backupDatabase().pipe(timeout(BACKUP_BEFORE_LOGOUT_TIMEOUT_MS))
      );
      void this.log.log(`[AuthEffects] Sauvegarde avant déconnexion : ${saved ? 'ok' : 'échec'}`);
    } catch (error) {
      void this.log.log(`[AuthEffects] Sauvegarde avant déconnexion impossible : ${String(error)}`);
    }
  }

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      tap((action) => this.log.log(`[AuthEffects] login$ triggered for ${action.request.username}`)),
      switchMap((action) => {
        this.log.log('[AuthEffects] Preparing to show loading indicator for login.');
        return from(this.presentLoading('Connexion en cours...')).pipe(
          switchMap(() => this.authService.login(action.request).pipe(
            tap(success => this.log.log(`[AuthEffects] authService.login returned: ${success}`)),
            map((success) => {
              if (success) {
                this.log.log('[AuthEffects] Login success, dispatching loginSuccess.');
                return AuthActions.loginSuccess({ user: this.authService.currentUser! });
              } else {
                this.log.log('[AuthEffects] Login failed, dispatching loginFailure.');
                return AuthActions.loginFailure({ error: 'Login failed' });
              }
            }),
            catchError((error) => {
              this.log.log(`[AuthEffects] CatchError in login stream: ${error.message}`);
              return of(AuthActions.loginFailure({ error: error.message || 'Unknown error' }));
            }),
            finalize(() => {
              this.log.log('[AuthEffects] Finalize in login stream, dismissing loading.');
              return this.dismissLoading();
            })
          ))
        );
      })
    )
  );

  loginSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginSuccess),
        tap(({ user }) => {
          if (!user?.mustChangePassword) {
            this.appUpdateService.startAfterLogin();
          }
          if (user?.mustChangePassword) {
            this.log.log('[AuthEffects] loginSuccess$ → /change-password');
            this.router.navigateByUrl('/change-password');
            return;
          }
          if (canAccessRecoveryManagerMobile(user)) {
            this.log.log('[AuthEffects] loginSuccess$ RECOVERY_MANAGER → /rm/plan');
            // Sauvegarde de démarrage de session RM (filet en cas de perte de la base).
            this.dataInitialization.backupDatabase().subscribe();
            this.router.navigateByUrl('/rm/plan');
            return;
          }
          this.log.log('[AuthEffects] loginSuccess$ → /initial-loading');
          this.router.navigateByUrl('/initial-loading');
        })
      ),
    { dispatch: false }
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      tap(() => this.log.log('[AuthEffects] logout$ triggered.')),
      switchMap(() => {
        this.log.log('[AuthEffects] Preparing to show loading indicator for logout.');
        return from(this.presentLoading('Déconnexion en cours...')).pipe(
          switchMap(() => from(this.backupBeforeLogout().then(() => this.authService.logout())).pipe(
            tap(() => this.log.log('[AuthEffects] authService.logout completed.')),
            map(() => {
              this.log.log('[AuthEffects] Logout success, dispatching logoutSuccess.');
              return AuthActions.logoutSuccess();
            }),
            catchError((error) => {
              this.log.log(`[AuthEffects] CatchError in logout stream: ${error.message}`);
              return of(AuthActions.logoutFailure({ error }));
            }),
            finalize(() => {
              this.log.log('[AuthEffects] Finalize in logout stream, dismissing loading.');
              return this.dismissLoading();
            })
          ))
        );
      })
    )
  );

  logoutSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logoutSuccess),
        tap(() => {
          void this.purgeRmLocalState();
          this.appUpdateService.resetSession();
          this.log.log('[AuthEffects] logoutSuccess$ triggered, navigating to /login.');
          this.router.navigateByUrl('/login');
        })
      ),
    { dispatch: false }
  );

  /**
   * Purge à la déconnexion. Les files ne perdent jamais une opération non synchronisée
   * (clearAll ne retire que les opérations déjà envoyées) ; le plan et le pack ne sont
   * effacés que s'il ne reste plus rien à envoyer, pour que la saisie reste affichable.
   */
  private async purgeRmLocalState(): Promise<void> {
    try {
      await Promise.all([
        this.rmCloseQueue.clearAll(),
        this.rmContactQueue.clearAll(),
        this.rmFieldControlQueue.clearAll(),
        this.rmTontineFieldControlQueue.clearAll(),
      ]);
      if (await this.rmPending.hasPending()) {
        void this.log.log('[AuthEffects] Saisies RM non synchronisées conservées (plan et pack gardés).');
        return;
      }
      await this.rmScope.clear();
    } catch (error) {
      void this.log.log(`[AuthEffects] Purge RM interrompue, rien n'est supprimé : ${String(error)}`);
    }
  }

  async presentLoading(message: string) {
    this.log.log(`[AuthEffects] presentLoading called with message: "${message}"`);
    if (this.loading) {
      this.log.log('[AuthEffects] A loading indicator is already present, dismissing it first.');
      await this.loading.dismiss();
      this.loading = null;
    }
    this.log.log('[AuthEffects] Creating new loading indicator.');
    this.loading = await this.loadingController.create({
      message,
      spinner: 'crescent',
      translucent: true,
      cssClass: 'custom-loading'
    });
    await this.loading.present();
    this.log.log('[AuthEffects] New loading indicator presented.');
  }

  async dismissLoading() {
    this.log.log('[AuthEffects] dismissLoading called.');
    if (this.loading) {
      this.log.log('[AuthEffects] Loading indicator found, dismissing.');
      await this.loading.dismiss();
      this.loading = null;
      this.log.log('[AuthEffects] Loading indicator dismissed and set to null.');
    } else {
      this.log.log('[AuthEffects] dismissLoading called, but no loading indicator was found.');
    }
  }
}
