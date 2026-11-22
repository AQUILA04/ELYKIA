import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonChip,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSearchbar,
} from '@ionic/angular';
import { TontineDashboardPage } from './tontine-dashboard.page';
import { RouterModule } from '@angular/router';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonChip, IonContent, IonFab, IonFabButton, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonSearchbar,
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
