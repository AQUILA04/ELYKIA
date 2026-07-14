import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgxPermissionsModule } from 'ngx-permissions';
import { NgxSpinnerModule } from 'ngx-spinner';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedComponentsModule } from '../shared/components/shared-components.module';
import { ClientRoutingModule } from './client-routing.module';
import { ClientAddComponent } from './client-add/client-add.component';
import { ClientListComponent } from './client-list/client-list.component';
import { ClientDetailsComponent } from './client-details/client-details.component';
import { ClientViewComponent } from './client-view/client-view.component';
import { ClientKpiCardsComponent } from './components/client-kpi-cards/client-kpi-cards.component';
import { ClientInfoCardComponent } from './components/client-info-card/client-info-card.component';
import { ClientCreditListComponent } from './components/client-credit-list/client-credit-list.component';
import { ClientCotisationHistoryComponent } from './components/client-cotisation-history/client-cotisation-history.component';

@NgModule({
  declarations: [
    ClientAddComponent,
    ClientListComponent,
    ClientDetailsComponent,
    ClientViewComponent,
    ClientKpiCardsComponent,
    ClientInfoCardComponent,
    ClientCreditListComponent,
    ClientCotisationHistoryComponent,
  ],
  imports: [
    CommonModule,
    ClientRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgxPermissionsModule,
    NgxSpinnerModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatButtonModule,
    MatTableModule,
    NgSelectModule,
    SharedComponentsModule,
  ],
})
export class ClientModule {}
