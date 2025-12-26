import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocalitiesRoutingModule } from './localities-routing.module';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { localityReducer, LocalityEffects } from '../../store/locality';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    LocalitiesRoutingModule,
    StoreModule.forFeature('localities', localityReducer),
    EffectsModule.forFeature([LocalityEffects])
  ]
})
export class LocalitiesModule { }
