import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, from } from 'rxjs';
import { catchError, map, switchMap, tap, finalize } from 'rxjs/operators';
import * as AuthActions from './auth.actions';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { LoggerService } from '../../core/services/logger.service';
import { Browser } from '@capacitor/browser';
import { environment } from '../../../environments/environment';
import { getWebBaseUrl } from '../../core/utils/web-base-url.util';
import { MobileSsoPayload, RECOVERY_MANAGER_PROFIL, User } from '../../models/auth.model';

@Injectable()
export class AuthEffects {
  private loading: HTMLIonLoadingElement | null = null;
  private lastSsoRedirectAt = 0;

  constructor(
    private actions$: Actions,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private log: LoggerService
  ) {}

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
          if (user?.profil === RECOVERY_MANAGER_PROFIL) {
            void this.redirectRecoveryManagerToWeb(user);
            return;
          }
          const target = user?.mustChangePassword ? '/change-password' : '/initial-loading';
          this.log.log(`[AuthEffects] loginSuccess$ triggered, navigating to ${target}.`);
          this.router.navigateByUrl(target);
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
          switchMap(() => from(this.authService.logout()).pipe(
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
          this.log.log('[AuthEffects] logoutSuccess$ triggered, navigating to /login.');
          this.router.navigateByUrl('/login');
        })
      ),
    { dispatch: false }
  );

  private async redirectRecoveryManagerToWeb(user: User): Promise<void> {
    const now = Date.now();
    if (now - this.lastSsoRedirectAt < 2000) {
      return;
    }
    this.lastSsoRedirectAt = now;

    const payload: MobileSsoPayload = {
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
      id: String(user.id),
      username: user.username,
      email: user.email,
      roles: user.roles || [],
      profil: user.profil,
      mustChangePassword: user.mustChangePassword === true,
    };

    const encoded = this.toBase64Url(JSON.stringify(payload));
    const webBase = getWebBaseUrl(environment.apiUrl);
    const url = `${webBase}/login#sso=${encoded}`;

    this.log.log('[AuthEffects] RECOVERY_MANAGER detected — opening web SSO.');
    try {
      await Browser.open({ url, toolbarColor: '#003366' });
      const toast = await this.toastController.create({
        message: 'Profil chef de recouvrement : redirection vers l\'application web…',
        duration: 3500,
        color: 'primary',
        position: 'top',
      });
      await toast.present();
      // Clear mobile session — recovery managers use the web app, not mobile sync.
      await this.authService.logout();
      this.router.navigateByUrl('/login');
    } catch (error: any) {
      this.log.log(`[AuthEffects] Failed to open web SSO: ${error?.message || error}`);
      const toast = await this.toastController.create({
        message: 'Impossible d\'ouvrir le web. Utilisez « Se connecter sur le web ».',
        duration: 4000,
        color: 'warning',
        position: 'top',
      });
      await toast.present();
    }
  }

  private toBase64Url(value: string): string {
    const base64 = btoa(unescape(encodeURIComponent(value)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
