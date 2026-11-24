import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TontineDashboardPage } from './tontine-dashboard.page';
import { RouterModule } from '@angular/router';
import { ClientAvatarComponent } from 'src/app/shared/components/client-avatar/client-avatar.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        ClientAvatarComponent,
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
