import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PermissionPicklistComponent } from './permission-picklist/permission-picklist.component';
import { ArticleSelectorComponent } from '../../credit/components/article-selector/article-selector.component';
import { ChangeDailyStakeComponent } from '../../credit/change-daily-stake/change-daily-stake.component';
import { CreateTontineComponent } from '../../credit/components/create-tontine/create-tontine.component';
import { AdvancedSearchComponent } from '../../credit/components/advanced-search/advanced-search.component';
import { ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { NgxSpinnerModule } from 'ngx-spinner';
import { MatInputModule } from '@angular/material/input';

@NgModule({
    declarations: [
        PermissionPicklistComponent,
        ArticleSelectorComponent,
        ChangeDailyStakeComponent,
        CreateTontineComponent,
        AdvancedSearchComponent
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
        AdvancedSearchComponent
    ]
})
export class SharedComponentsModule { }
