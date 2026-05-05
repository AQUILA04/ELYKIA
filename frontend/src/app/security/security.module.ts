import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';

import { SecurityRoutingModule } from './security-routing.module';
import { ProfilListComponent } from './pages/profil-list/profil-list.component';
import { ProfilFormComponent } from './pages/profil-form/profil-form.component';
import { PermissionListComponent } from './pages/permission-list/permission-list.component';
import { PermissionFormComponent } from './pages/permission-form/permission-form.component';
import { SharedComponentsModule } from '../shared/components/shared-components.module';

@NgModule({
    declarations: [
        ProfilListComponent,
        ProfilFormComponent,
        PermissionListComponent,
        PermissionFormComponent
    ],
    imports: [
        CommonModule,
        SharedComponentsModule,
        SecurityRoutingModule,
        ReactiveFormsModule,
        MatTableModule,
        MatPaginatorModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSnackBarModule,
        MatTooltipModule
    ]
})
export class SecurityModule { }
