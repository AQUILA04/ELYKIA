import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxPermissionsModule } from 'ngx-permissions';
import { NgxSpinnerModule } from 'ngx-spinner';
import { SharedComponentsModule } from '@shared/components/shared-components.module';
import { OutRoutingModule } from './out-routing.module';
import { OutListComponent } from './out-list/out-list.component';
import { OutDetailsComponent } from './out-details/out-details.component';
import { OutPdfListComponent } from './out-pdf-list/out-pdf-list.component';
import { OldReleaseListComponent } from './old-release-list/old-release-list.component';

@NgModule({
  declarations: [
    OutListComponent,
    OutDetailsComponent,
    OutPdfListComponent,
    OldReleaseListComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatTooltipModule,
    NgxPermissionsModule,
    NgxSpinnerModule,
    SharedComponentsModule,
    OutRoutingModule
  ]
})
export class OutModule {}
