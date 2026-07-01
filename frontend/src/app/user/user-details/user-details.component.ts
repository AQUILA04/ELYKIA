import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { User, UserService } from '../service/user.service';
import { UserAuthorizedDevice, UserDeviceService } from '../service/user-device.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { PermissionService } from '../../security/services/permission.service';
import { FeatureFlagService, FeatureFlags } from 'src/app/shared/service/feature-flag.service';
import { MOBILE_DEVICE_RESTRICTION_PARAMETER_KEY, ParameterService } from 'src/app/parameters/parameter.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class UserDetailsComponent implements OnInit, OnDestroy {
  userId?: number;
  user: User | null = null;
  isLoading = true;
  assignedPermissions: string[] = [];
  allPermissions: string[] = [];
  originalPermissions: string[] = [];
  savingPermissions = false;
  mobileDeviceManagementEnabled = false;
  mobileDeviceRestrictionParameterEnabled = false;
  authorizedDevices: UserAuthorizedDevice[] = [];
  loadingDevices = false;
  updatingDeviceRestriction = false;

  currentDate = new Date();
  private dateIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    private userService: UserService,
    private permissionService: PermissionService,
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService,
    private tokenStorage: TokenStorageService,
    private featureFlagService: FeatureFlagService,
    private userDeviceService: UserDeviceService,
    private parameterService: ParameterService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);

    this.route.params.subscribe(params => {
      this.userId = +params['id'];
      if (this.userId) {
        this.loadUserDetails(this.userId);
      }
    });
    this.loadAllPermissions();
    this.mobileDeviceManagementEnabled = this.featureFlagService.isFeatureEnabled(
      FeatureFlags.MobileDeviceManagement
    );
    if (this.mobileDeviceManagementEnabled) {
      this.loadMobileDeviceRestrictionParameter();
    }
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  onCancel(): void {
    this.router.navigate(['/user-list']);
  }

  navigateToEdit(): void {
    this.router.navigate(['/user-add', this.userId]);
  }

  isUserActive(): boolean {
    return this.user?.state === 'ENABLED' || this.user?.active === true;
  }

  getStatusLabel(): string {
    return this.isUserActive() ? 'Actif' : 'Inactif';
  }

  toggleActive(): void {
    if (!this.userId || !this.user) {
      return;
    }
    const active = this.isUserActive();
    const action = active ? 'désactiver' : 'activer';
    this.alertService.showConfirmation('Confirmation', `Voulez-vous vraiment ${action} cet utilisateur ?`)
      .then((result) => {
        if (!result) {
          return;
        }
        const request = active
          ? this.userService.deactivateUser(this.userId!)
          : this.userService.activateUser(this.userId!);
        request.subscribe({
          next: () => {
            this.alertService.showDefaultSucces(`Utilisateur ${active ? 'désactivé' : 'activé'} avec succès.`);
            this.loadUserDetails(this.userId!);
          },
          error: (err) => {
            this.alertService.showError(err?.error?.message || 'Erreur lors de l\'action.');
          }
        });
      });
  }

  loadUserDetails(userId: number): void {
    this.isLoading = true;
    this.userService.getUserById(userId).subscribe({
      next: (res) => {
        this.user = res.data;
        if (this.user?.userPermissions) {
          this.assignedPermissions = this.user.userPermissions.map(
            (p: { name?: string; permission?: { name?: string } } | string) =>
              typeof p === 'string' ? p : (p.name || p.permission?.name || '')
          ).filter(Boolean);
        } else {
          this.assignedPermissions = [];
        }
        this.originalPermissions = [...this.assignedPermissions];
        this.isLoading = false;
        if (this.mobileDeviceManagementEnabled) {
          this.loadAuthorizedDevices(userId);
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des détails de l\'utilisateur', error);
        const errorMessage = error?.error?.message || 'Erreur lors du chargement des détails de l\'utilisateur';
        this.alertService.showError(errorMessage);
        this.isLoading = false;
      }
    });
  }

  loadAllPermissions(): void {
    this.permissionService.getAllList().subscribe({
      next: (res) => {
        const rawPermissions = res.data ? res.data : (Array.isArray(res) ? res : []);
        this.allPermissions = rawPermissions.map((p: { name?: string } | string) =>
          typeof p === 'string' ? p : (p.name || '')
        ).filter(Boolean);
      },
      error: (err) => console.error('Erreur chargement permissions', err)
    });
  }

  onPermissionsChange(newPermissions: string[]): void {
    this.assignedPermissions = newPermissions;
  }

  savePermissions(): void {
    if (!this.userId || this.savingPermissions) {
      return;
    }

    const added = this.assignedPermissions.filter(p => !this.originalPermissions.includes(p));
    const removed = this.originalPermissions.filter(p => !this.assignedPermissions.includes(p));

    if (added.length === 0 && removed.length === 0) {
      this.alertService.showInfo('Aucune modification détectée');
      return;
    }

    this.savingPermissions = true;
    const tasks: Promise<unknown>[] = [];

    added.forEach(p => {
      tasks.push(firstValueFrom(this.userService.addPermission(this.userId!, p)));
    });
    removed.forEach(p => {
      tasks.push(firstValueFrom(this.userService.removePermission(this.userId!, p)));
    });

    Promise.all(tasks)
      .then(() => {
        this.alertService.showSuccess('Permissions mises à jour avec succès');
        this.loadUserDetails(this.userId!);
      })
      .catch(err => {
        console.error('Error updating permissions', err);
        this.alertService.showError('Erreur lors de la mise à jour des permissions');
        this.loadUserDetails(this.userId!);
      })
      .finally(() => {
        this.savingPermissions = false;
      });
  }

  loadMobileDeviceRestrictionParameter(): void {
    this.parameterService.getByKey(MOBILE_DEVICE_RESTRICTION_PARAMETER_KEY).subscribe({
      next: (parameter) => {
        this.mobileDeviceRestrictionParameterEnabled = parameter?.value === 'true';
      },
      error: () => {
        this.mobileDeviceRestrictionParameterEnabled = false;
      },
    });
  }

  loadAuthorizedDevices(userId: number): void {
    this.loadingDevices = true;
    this.userDeviceService.listDevices(userId).subscribe({
      next: (res) => {
        this.authorizedDevices = res.data || [];
        this.loadingDevices = false;
      },
      error: (err) => {
        console.error('Erreur chargement appareils', err);
        this.authorizedDevices = [];
        this.loadingDevices = false;
      },
    });
  }

  onDeviceRestrictionToggle(enabled: boolean): void {
    if (!this.userId || !this.mobileDeviceRestrictionParameterEnabled) {
      return;
    }
    this.updatingDeviceRestriction = true;
    this.userDeviceService.updateRestriction(this.userId, enabled).subscribe({
      next: () => {
        this.alertService.showDefaultSucces(
          enabled
            ? 'Restriction par appareil activée pour cet utilisateur.'
            : 'Restriction par appareil désactivée pour cet utilisateur.'
        );
        this.loadUserDetails(this.userId!);
        this.updatingDeviceRestriction = false;
      },
      error: (err) => {
        this.alertService.showError(err?.error?.message || 'Erreur lors de la mise à jour de la restriction.');
        this.updatingDeviceRestriction = false;
        this.loadUserDetails(this.userId!);
      },
    });
  }

  revokeDevice(device: UserAuthorizedDevice): void {
    if (!this.userId) {
      return;
    }
    this.alertService.showConfirmation(
      'Révoquer l\'appareil',
      `Voulez-vous révoquer l'appareil « ${device.deviceLabel || device.model || 'inconnu'} » ?`
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.userDeviceService.revokeDevice(this.userId!, device.id).subscribe({
        next: () => {
          this.alertService.showDefaultSucces('Appareil révoqué avec succès.');
          this.loadAuthorizedDevices(this.userId!);
        },
        error: (err) => {
          this.alertService.showError(err?.error?.message || 'Erreur lors de la révocation.');
        },
      });
    });
  }

  restoreDevice(device: UserAuthorizedDevice): void {
    if (!this.userId) {
      return;
    }
    this.userDeviceService.restoreDevice(this.userId!, device.id).subscribe({
      next: () => {
        this.alertService.showDefaultSucces('Appareil réactivé avec succès.');
        this.loadAuthorizedDevices(this.userId!);
      },
      error: (err) => {
        this.alertService.showError(err?.error?.message || 'Erreur lors de la réactivation.');
      },
    });
  }
}
