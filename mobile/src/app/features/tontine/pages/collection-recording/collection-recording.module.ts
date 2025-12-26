import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { CollectionRecordingPage } from './collection-recording.page';
import { TontineReceiptModalModule } from 'src/app/shared/components/tontine-receipt-modal/tontine-receipt-modal.module';

const routes: Routes = [
    {
        path: '',
        component: CollectionRecordingPage
    }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        IonicModule,
        RouterModule.forChild(routes),
        TontineReceiptModalModule
    ],
    declarations: [CollectionRecordingPage]
})
export class CollectionRecordingPageModule { }
