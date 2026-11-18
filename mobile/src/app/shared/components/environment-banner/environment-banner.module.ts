import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnvironmentBannerComponent } from './environment-banner.component';

@NgModule({
  declarations: [EnvironmentBannerComponent],
  imports: [CommonModule],
  exports: [EnvironmentBannerComponent]
})
export class EnvironmentBannerModule {}
