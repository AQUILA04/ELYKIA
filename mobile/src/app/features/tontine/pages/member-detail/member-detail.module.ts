import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { MemberDetailPage } from './member-detail.page';
import { IfUnitPriceDirective } from 'src/app/shared/directives/if-unit-price.directive';

const routes: Routes = [
    {
        path: '',
        component: MemberDetailPage
    }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        RouterModule.forChild(routes),
        IfUnitPriceDirective
    ],
    declarations: [MemberDetailPage]
})
export class MemberDetailPageModule { }
