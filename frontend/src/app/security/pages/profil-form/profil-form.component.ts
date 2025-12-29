import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfilService, UserProfil } from '../../services/profil.service';
import { PermissionService } from '../../services/permission.service';

@Component({
    selector: 'app-profil-form',
    templateUrl: './profil-form.component.html',
    styleUrls: ['./profil-form.component.scss'],
    standalone: false
})
export class ProfilFormComponent implements OnInit {
    profilForm!: FormGroup;
    isEditMode = false;
    profilId?: number;

    allPermissions: any[] = [];
    assignedPermissions: any[] = [];
    originalPermissions: any[] = [];

    constructor(
        private fb: FormBuilder,
        private profilService: ProfilService,
        private permissionService: PermissionService, // Add PermissionService
        private route: ActivatedRoute,
        private router: Router,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.loadAllPermissions();
        this.route.params.subscribe(params => {
            if (params['id']) {
                this.isEditMode = true;
                this.profilId = +params['id']; // Cast to number
                this.loadProfil(this.profilId);
            }
        });
    }

    initForm() {
        this.profilForm = this.fb.group({
            name: ['', Validators.required],
            description: ['']
        });
    }

    loadAllPermissions() {
        this.permissionService.getAllList().subscribe(res => {
            const rawPermissions = res.data ? res.data : (Array.isArray(res) ? res : []);
            this.allPermissions = rawPermissions.map((p: any) => p.name || p);
        });
    }

    loadProfil(id: number) {
        this.profilService.getById(id).subscribe(data => {
            this.profilForm.patchValue({
                name: data.data.name,
                description: data.data.description
            });
            // Load permissions
            const perms = data.data.permissions || data.data.profilPermissions || [];
            this.assignedPermissions = perms.map((p: any) => p.name || p.permission?.name || p);
            this.originalPermissions = [...this.assignedPermissions];
        });
    }

    onPermissionsChange(newPermissions: any[]) {
        this.assignedPermissions = newPermissions;
    }

    onSubmit() {
        if (this.profilForm.invalid) {
            return;
        }

        const profil: UserProfil = this.profilForm.value;

        if (this.isEditMode && this.profilId) {
            this.profilService.update(this.profilId, profil).subscribe(() => {
                this.savePermissions(this.profilId!); // Save permissions after update
                this.snackBar.open('Profil mis à jour avec succès', 'Fermer', { duration: 3000 });
                this.router.navigate(['/security/profils']);
            });
        } else {
            this.profilService.create(profil).subscribe((res: any) => {
                // If creating, we might need the ID to add permissions
                // Assuming response contains the created object with ID
                const newId = res.data?.id || res.id;
                if (newId) {
                    this.savePermissions(newId);
                }
                this.snackBar.open('Profil créé avec succès', 'Fermer', { duration: 3000 });
                this.router.navigate(['/security/profils']);
            });
        }
    }

    savePermissions(profilId: number) {
        const added = this.assignedPermissions.filter(p => !this.originalPermissions.includes(p));
        const removed = this.originalPermissions.filter(p => !this.assignedPermissions.includes(p));

        if (added.length > 0) {
            this.profilService.addPermissions({ profilId, permissions: added }).subscribe();
        }

        removed.forEach(p => {
            this.profilService.removePermission(profilId, p).subscribe();
        });
    }
}
