import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';
import { SharedComponentsModule } from '../shared/components/shared-components.module';

import { SecurityRoutingModule } from './security-routing.module';

// Angular Material Modules (MDC)
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';

// Pages
import { ProfilListComponent } from './pages/profil-list/profil-list.component';
import { ProfilFormComponent } from './pages/profil-form/profil-form.component';
import { PermissionListComponent } from './pages/permission-list/permission-list.component';
import { PermissionFormComponent } from './pages/permission-form/permission-form.component';

@NgModule({
  declarations: [
    ProfilListComponent,
    ProfilFormComponent,
    PermissionListComponent,
    PermissionFormComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SecurityRoutingModule,
    SharedModule,
    SharedComponentsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatSortModule,
    MatCheckboxModule,
    MatSelectModule,
    MatDialogModule
  ]
})
export class SecurityModule { }
