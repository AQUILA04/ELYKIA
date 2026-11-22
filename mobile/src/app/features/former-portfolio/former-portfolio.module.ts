import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { FormerPortfolioPage } from './former-portfolio.page';

const routes: Routes = [
  { path: '', component: FormerPortfolioPage }
];

@NgModule({
  imports: [CommonModule, FormsModule, IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonLabel, IonSegment, IonSegmentButton, IonTitle, IonToolbar, RouterModule.forChild(routes)],
  declarations: [FormerPortfolioPage]
})
export class FormerPortfolioPageModule {}
