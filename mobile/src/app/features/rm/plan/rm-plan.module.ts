import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RmPlanPageRoutingModule } from './rm-plan-routing.module';
import { RmPlanPage } from './rm-plan.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RmPlanPageRoutingModule],
  declarations: [RmPlanPage]
})
export class RmPlanPageModule {}
