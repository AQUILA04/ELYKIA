import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxPermissionsModule } from 'ngx-permissions';
import { NgxSpinnerModule } from 'ngx-spinner';
import { LocalityRoutingModule } from './locality-routing.module';
import { LocalityListComponent } from './localitylist/localitylist.component';
import { LocalityAddComponent } from './localityadd/localityadd.component';
import { LocalityDetailsComponent } from './localitydetails/localitydetails.component';

@NgModule({
  declarations: [
    LocalityListComponent,
    LocalityAddComponent,
    LocalityDetailsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatPaginatorModule,
    MatIconModule,
    MatTooltipModule,
    NgxPermissionsModule,
    NgxSpinnerModule,
    LocalityRoutingModule
  ]
})
export class LocalityModule {}
