import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxSpinnerModule } from 'ngx-spinner';
import { GestionRoutingModule } from './gestion-routing.module';
import { GestionListComponent } from './gestion-list/gestion-list.component';
import { GestionAddComponent } from './gestion-add/gestion-add.component';
import { GestionDetailsComponent } from './gestion-details/gestion-details.component';

@NgModule({
  declarations: [
    GestionListComponent,
    GestionAddComponent,
    GestionDetailsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatTooltipModule,
    NgxSpinnerModule,
    GestionRoutingModule
  ]
})
export class GestionModule {}
