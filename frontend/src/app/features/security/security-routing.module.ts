import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ProfilListComponent } from './pages/profil-list/profil-list.component';
import { ProfilFormComponent } from './pages/profil-form/profil-form.component';
import { PermissionListComponent } from './pages/permission-list/permission-list.component';
import { PermissionFormComponent } from './pages/permission-form/permission-form.component';

const routes: Routes = [
    { path: 'profils', component: ProfilListComponent },
    { path: 'profils/add', component: ProfilFormComponent },
    { path: 'profils/edit/:id', component: ProfilFormComponent },
    { path: 'permissions', component: PermissionListComponent },
    { path: 'permissions/add', component: PermissionFormComponent },
    { path: '', redirectTo: 'profils', pathMatch: 'full' }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SecurityRoutingModule { }
