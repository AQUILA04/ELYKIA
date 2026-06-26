import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { NgxPermissionsService } from 'ngx-permissions';
import { environment } from '../../../environments/environment';
import { AiPermissions } from '../../shared/constants/ai-permission.constant';
import { FeatureFlagService, FeatureFlags } from '../../shared/service/feature-flag.service';

@Injectable({
  providedIn: 'root',
})
export class AiChatGuard implements CanActivate {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly permissionsService: NgxPermissionsService,
    private readonly router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    const featureEnabled =
      environment.aiChatEnabled ||
      this.featureFlagService.isFeatureEnabled(FeatureFlags.ElykiaAi);
    if (!featureEnabled) {
      void this.router.navigate(['/home']);
      return false;
    }

    const hasChatRole = await this.permissionsService.hasPermission(AiPermissions.Chat);
    if (!hasChatRole) {
      void this.router.navigate(['/home']);
      return false;
    }

    return true;
  }
}
