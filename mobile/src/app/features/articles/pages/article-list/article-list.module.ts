import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { IonicModule } from '@ionic/angular';

import { ArticleListPageRoutingModule } from './article-list-routing.module';

import { ArticleListPage } from './article-list.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    ArticleListPageRoutingModule,
    ScrollingModule
  ],
  declarations: [ArticleListPage]
})
export class ArticleListPageModule {}
