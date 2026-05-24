import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges, SimpleChanges } from '@angular/core';
import { ClientReliquat, RecoveryPlan } from '../../../models/reliquat.model';

@Component({
  selector: 'app-reliquat-display',
  templateUrl: './reliquat-display.component.html',
  styleUrls: ['./reliquat-display.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReliquatDisplayComponent implements OnChanges {
  @Input() clientReliquat: ClientReliquat | null = null;
  @Input() recoveryPlan: RecoveryPlan | null = null;
  @Input() stakeAmount: number = 0;

  @Output() useReliquatChanged = new EventEmitter<boolean>();
  @Output() keepReliquatChanged = new EventEmitter<boolean>();

  useReliquat: boolean = true;
  keepReliquat: boolean = true;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clientReliquat']) {
      if (this.clientReliquat && this.clientReliquat.totalAmount > 0) {
        this.useReliquat = true;
      } else {
        this.useReliquat = false;
      }
      this.useReliquatChanged.emit(this.useReliquat);
    }

    if (changes['recoveryPlan']) {
      if (this.recoveryPlan && this.recoveryPlan.reliquatGenerated > 0) {
        // Only set default if keepReliquat hasn't been manually set, but spec says:
        // "WHEN recoveryPlan.reliquatGenerated > 0, THE ReliquatDisplayComponent SHALL afficher la checkbox "Conserver le reliquat" cochée par défaut."
        // We'll reset it to true when it's generated just to be safe, or just leave it as true.
        if (changes['recoveryPlan'].previousValue?.reliquatGenerated === 0) {
           this.keepReliquat = true;
           this.keepReliquatChanged.emit(this.keepReliquat);
        }
      } else {
        this.keepReliquat = false;
      }
    }
  }

  onUseReliquatChange(event: any) {
    this.useReliquat = event.detail.checked;
    this.useReliquatChanged.emit(this.useReliquat);
  }

  onKeepReliquatChange(event: any) {
    this.keepReliquat = event.detail.checked;
    this.keepReliquatChanged.emit(this.keepReliquat);
  }
}
