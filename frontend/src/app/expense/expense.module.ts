import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ExpenseRoutingModule } from './expense-routing.module';

// Components
import { ExpenseDashboardComponent } from './pages/dashboard/dashboard.component';
import { ExpenseListComponent } from './pages/list/list.component';
import { ExpenseFormComponent } from './pages/form/form.component';
import { ExpenseTypeListComponent } from './pages/type-list/type-list.component';
import { ExpenseTypeFormComponent } from './pages/type-form/type-form.component';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';

@NgModule({
    declarations: [
        ExpenseDashboardComponent,
        ExpenseListComponent,
        ExpenseFormComponent,
        ExpenseTypeListComponent,
        ExpenseTypeFormComponent
    ],
    imports: [
        CommonModule,
        ExpenseRoutingModule,
        FormsModule,
        ReactiveFormsModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatSnackBarModule
    ]
})
export class ExpenseModule { }
