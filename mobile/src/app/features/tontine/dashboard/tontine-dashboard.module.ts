import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TontineDashboardPage } from './tontine-dashboard.page';
import { RouterModule } from '@angular/router';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        RouterModule.forChild([
            {
                path: '',
                component: TontineDashboardPage
            }
        ])
    ],
    declarations: [TontineDashboardPage]
})
export class TontineDashboardPageModule { }
