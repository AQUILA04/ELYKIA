import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';

import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { ArticleListPageRoutingModule } from './article-list-routing.module';

import { ArticleListPage } from './article-list.page';
import { IfUnitPriceDirective } from 'src/app/shared/directives/if-unit-price.directive';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonBackButton, IonButtons, IonCard, IonCardContent, IonContent, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonLabel, IonSearchbar, IonSegment, IonSegmentButton, IonSpinner, IonTitle, IonToolbar,
    ArticleListPageRoutingModule,
    ScrollingModule,
    IfUnitPriceDirective
  ],
  declarations: [ArticleListPage]
})
export class ArticleListPageModule {}
