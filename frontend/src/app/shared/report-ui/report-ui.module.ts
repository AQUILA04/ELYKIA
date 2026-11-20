import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuidedTourComponent } from './guided-tour/guided-tour.component';
import { FcfaPipe } from './fcfa.pipe';

/**
 * Briques communes des écrans « v2 » (rapport commerciaux, stock commercial) :
 * visite guidée, format FCFA. Les styles sont dans `styles/_report-v2.scss`.
 */
@NgModule({
  declarations: [GuidedTourComponent, FcfaPipe],
  imports: [CommonModule],
  exports: [GuidedTourComponent, FcfaPipe],
})
export class ReportUiModule {}
