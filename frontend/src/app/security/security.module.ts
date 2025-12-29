import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

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
