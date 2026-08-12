import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RmMorePage } from './rm-more.page';
import { RmSessionBarModule } from '../../features/rm/session-bar/rm-session-bar.module';

const routes: Routes = [{ path: '', component: RmMorePage }];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), RmSessionBarModule],
  declarations: [RmMorePage]
})
export class RmMorePageModule {}
