import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ExpenseDashboardComponent } from './pages/dashboard/dashboard.component';
import { ExpenseListComponent } from './pages/list/list.component';
import { ExpenseFormComponent } from './pages/form/form.component';
import { ExpenseTypeListComponent } from './pages/type-list/type-list.component';
import { ExpenseTypeFormComponent } from './pages/type-form/type-form.component';

const routes: Routes = [
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    },
    {
        path: 'dashboard',
        component: ExpenseDashboardComponent
    },
    {
        path: 'list',
        component: ExpenseListComponent
    },
    {
        path: 'add',
        component: ExpenseFormComponent
    },
    {
        path: 'edit/:id',
        component: ExpenseFormComponent
    },
    {
        path: 'types',
        component: ExpenseTypeListComponent
    },
    {
        path: 'types/add',
        component: ExpenseTypeFormComponent
    },
    {
        path: 'types/edit/:id',
        component: ExpenseTypeFormComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ExpenseRoutingModule { }
