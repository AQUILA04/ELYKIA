import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PermissionService, UserPermission } from '../../services/permission.service';

@Component({
    selector: 'app-permission-form',
    templateUrl: './permission-form.component.html',
    styleUrls: ['./permission-form.component.scss'],
    standalone: false
})
export class PermissionFormComponent implements OnInit {
    permissionForm!: FormGroup;

    constructor(
        private fb: FormBuilder,
        private permissionService: PermissionService,
        private router: Router,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
        this.initForm();
    }

    initForm() {
        this.permissionForm = this.fb.group({
            name: ['', Validators.required]
        });
    }

    onSubmit() {
        if (this.permissionForm.invalid) {
            return;
        }

        const permission: UserPermission = this.permissionForm.value;

        this.permissionService.create(permission).subscribe(() => {
            this.snackBar.open('Permission créée avec succès', 'Fermer', { duration: 3000 });
            this.router.navigate(['/security/permissions']);
        });
    }
}
