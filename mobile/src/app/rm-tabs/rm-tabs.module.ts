import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RmTabsPageRoutingModule } from './rm-tabs-routing.module';
import { RmTabsPage } from './rm-tabs.page';

@NgModule({
  imports: [IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs, CommonModule, FormsModule, RmTabsPageRoutingModule],
  declarations: [RmTabsPage]
})
export class RmTabsPageModule {}
