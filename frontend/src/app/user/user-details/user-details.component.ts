import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../service/user.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { PermissionService } from '../../security/services/permission.service';

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss']
})
export class UserDetailsComponent implements OnInit {
  userId?: number;
  user: any;
  isLoading = true;
  profiles: any;
  profileName: string = '';
  assignedPermissions: any[] = [];
  allPermissions: any[] = [];
  originalPermissions: any[] = []; // To track changes

  constructor(
    private userService: UserService,
    private permissionService: PermissionService,
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService,
    private tokenStorage: TokenStorageService,
    private spinner: NgxSpinnerService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.userId = +params['id'];
      if (this.userId) {
        this.loadUserDetails(this.userId);
      }
    });
    this.loadProfiles();
    this.loadAllPermissions();
  }
  onCancel(): void {
    this.router.navigate(['/user-list']);
  }
  navigateToEdit(): void {
    this.router.navigate(['/user-add', this.userId]);
  }
  loadUserDetails(userId: number): void {
    this.spinner.show();
    this.userService.getUserById(userId).subscribe(
      res => {
        this.spinner.hide();
        this.user = res.data;
        // Map user permissions to a format suitable for the picklist (using name property)
        if (this.user.userPermissions) {
          // Assuming userPermissions is an array of objects with a permission property or name property
          // We need to verify the structure, but usually it's list of UserPermission objects
          // Let's assume we extract the permission names.
          // If structure is simple { name: '...' } use it directly.
          // If it's complex, we map it.
          // For safety, let's look for 'name' in the objects.
          this.assignedPermissions = this.user.userPermissions.map((p: any) => p.name || p.permission?.name || p);
          this.originalPermissions = [...this.assignedPermissions];
        } else {
          this.assignedPermissions = [];
          this.originalPermissions = [];
        }
        this.isLoading = false;
      },
      error => {
        this.spinner.hide();
        console.error('Erreur lors du chargement des détails de l\'utilisateur', error);
        const errorMessage = error?.error?.message || 'Erreur lors du chargement des détails de l\'utilisateur';
        this.alertService.showError(errorMessage);
        this.isLoading = false;
      }
    );
  }
  loadProfiles(): void {
    this.spinner.show();
    this.userService.getProfiles().subscribe(
      response => {
        this.spinner.hide();
        this.profiles = response.profil;
      },
      error => {
        this.spinner.hide();
        console.error('Error fetching profiles', error);
      }
    );
  }
  loadAllPermissions(): void {
    this.permissionService.getAllList().subscribe(
      res => {
        const rawPermissions = res.data ? res.data : (Array.isArray(res) ? res : []);
        // Map to strings for consistency
        this.allPermissions = rawPermissions.map((p: any) => p.name || p);
      }
    );
  }

  onPermissionsChange(newPermissions: any[]) {
    this.assignedPermissions = newPermissions;
  }

  savePermissions(): void {
    if (!this.userId) return;

    const added = this.assignedPermissions.filter(p => !this.originalPermissions.includes(p));
    const removed = this.originalPermissions.filter(p => !this.assignedPermissions.includes(p));

    if (added.length === 0 && removed.length === 0) {
      this.alertService.showInfo('Aucune modification détectée');
      return;
    }

    this.spinner.show();
    const promises: any[] = [];

    added.forEach(p => {
      promises.push(this.userService.addPermission(this.userId!, p).toPromise());
    });

    removed.forEach(p => {
      promises.push(this.userService.removePermission(this.userId!, p).toPromise());
    });

    Promise.all(promises).then(() => {
      this.spinner.hide();
      this.alertService.showSuccess('Permissions mises à jour avec succès');
      this.loadUserDetails(this.userId!);
    }).catch(err => {
      this.spinner.hide();
      console.error("Error updating permissions", err);
      this.alertService.showError('Erreur lors de la mise à jour des permissions');
      // Reload to reset state
      this.loadUserDetails(this.userId!);
    });
  }

  onBack(): void {
    this.router.navigate(['/user-list']);
  }
}