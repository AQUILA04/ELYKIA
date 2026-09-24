import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxSpinnerModule } from 'ngx-spinner';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { SharedComponentsModule } from '../shared/components/shared-components.module';
import { CommercialRoutingModule } from './commercial-routing.module';
import { CommercialListComponent } from './commercial-list/commercial-list.component';
import { CommercialViewComponent } from './commercial-view/commercial-view.component';

@NgModule({
  declarations: [
    CommercialListComponent,
    CommercialViewComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CommercialRoutingModule,
    NgxSpinnerModule,
    SharedComponentsModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonToggleModule,
  ],
})
export class CommercialModule {}
