import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatIconModule } from '@angular/material/icon';
import { PermissionPicklistComponent } from './permission-picklist/permission-picklist.component';
import { ArticleSelectorComponent } from '../../credit/components/article-selector/article-selector.component';
import { ChangeDailyStakeComponent } from '../../credit/change-daily-stake/change-daily-stake.component';
import { CreateTontineComponent } from '../../credit/components/create-tontine/create-tontine.component';
import { AdvancedSearchComponent } from '../../credit/components/advanced-search/advanced-search.component';
import { ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { NgxSpinnerModule } from 'ngx-spinner';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { StockExportFilterComponent } from './stock-export-filter/stock-export-filter.component';
import { CommercialSelectorComponent } from './commercial-selector/commercial-selector.component';

@NgModule({
    declarations: [
        PermissionPicklistComponent,
        ArticleSelectorComponent,
        ChangeDailyStakeComponent,
        CreateTontineComponent,
        AdvancedSearchComponent,
        StockExportFilterComponent,
        CommercialSelectorComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatListModule,
        MatButtonModule,
        MatIconModule,
        NgSelectModule,
        MatFormFieldModule,
        MatInputModule,
        MatTooltipModule,
        MatSnackBarModule,
        MatDialogModule,
        NgxSpinnerModule
    ],
    exports: [
        PermissionPicklistComponent,
        ArticleSelectorComponent,
        ChangeDailyStakeComponent,
        CreateTontineComponent,
        AdvancedSearchComponent,
        StockExportFilterComponent,
        CommercialSelectorComponent
    ]
})
export class SharedComponentsModule { }
