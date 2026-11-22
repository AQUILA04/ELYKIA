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
import { OperationRoutingModule } from './operation-routing.module';
import { OperationListComponent } from './operation-list/operation-list.component';
import { OperationAddComponent } from './operation-add/operation-add.component';
import { OperationDetailsComponent } from './operation-details/operation-details.component';

@NgModule({
  declarations: [
    OperationListComponent,
    OperationAddComponent,
    OperationDetailsComponent
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
    OperationRoutingModule
  ]
})
export class OperationModule {}
