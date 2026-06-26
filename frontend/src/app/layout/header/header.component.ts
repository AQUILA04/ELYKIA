import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import Swal from 'sweetalert2';
import { AuthService } from "../../auth/service/auth.service";
import { LayoutService } from 'src/app/shared/service/layout.service';
import { environment } from 'src/environments/environment';
import { FeatureFlagService, FeatureFlags } from 'src/app/shared/service/feature-flag.service';
import { AiPermissions } from 'src/app/shared/constants/ai-permission.constant';
import { NgxPermissionsService } from 'ngx-permissions';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  username: string | null = '';
  showElykiaAi = false;

  constructor(private router: Router,
    private tokenStorage: TokenStorageService,
    private authService: AuthService,
    private alertService: AlertService,
    private layoutService: LayoutService,
    private featureFlagService: FeatureFlagService,
    private permissionsService: NgxPermissionsService
  ) {

  }

  toggleSidebar() {
    this.layoutService.toggleSidebar();
  }
  ngOnInit(): void {

    this.username = this.authService.getUsername();
    this.refreshElykiaAiVisibility();
    this.featureFlagService.flags$.subscribe(() => this.refreshElykiaAiVisibility());
  }

  private refreshElykiaAiVisibility(): void {
    const featureEnabled =
      environment.aiChatEnabled ||
      this.featureFlagService.isFeatureEnabled(FeatureFlags.ElykiaAi);
    if (!featureEnabled) {
      this.showElykiaAi = false;
      return;
    }
    void this.permissionsService.hasPermission(AiPermissions.Chat).then((hasRole) => {
      this.showElykiaAi = hasRole;
    });
  }

  confirmLogout(): void {
    this.alertService.showConfirmation('Confirmation de deconnexion', 'Voulez-vous vraiment vous déconnecter?', 'Oui', 'Non')
      .then((result) => {
        if (result) {
          this.logout();
        }
      });
  }

  logout(): void {
    // Utiliser le même mécanisme de déconnexion centralisé que le reste de l'application
    this.authService.logout();
    // Propage explicitement la déconnexion aux autres onglets via l'événement logout-event
    localStorage.setItem('logout-event', Date.now().toString());
  }
}
