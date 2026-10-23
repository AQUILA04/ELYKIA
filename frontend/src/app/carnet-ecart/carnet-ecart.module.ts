import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarnetEcartRoutingModule } from './carnet-ecart-routing.module';
import { CarnetEcartListComponent } from './pages/carnet-ecart-list/carnet-ecart-list.component';

@NgModule({
  declarations: [CarnetEcartListComponent],
  imports: [CommonModule, FormsModule, CarnetEcartRoutingModule]
})
export class CarnetEcartModule {}
