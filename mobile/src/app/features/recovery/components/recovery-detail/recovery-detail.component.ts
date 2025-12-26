import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Recovery } from '../../../../models/recovery.model';
import { selectRecoveryById } from '../../../../store/recovery/recovery.selectors';
import * as RecoverySelectors from '../../../../store/recovery/recovery.selectors';
import { RecoveryView } from '../../../../models/recovery-view.model';

@Component({
  selector: 'app-recovery-detail',
  templateUrl: './recovery-detail.component.html',
  styleUrls: ['./recovery-detail.component.scss'],
  standalone: false
})
export class RecoveryDetailComponent implements OnInit {

  @Input() recoveryId!: string;
  recovery$: Observable<RecoveryView | undefined> = new Observable();

  constructor(private store: Store, private modalController: ModalController) {
  }

  ngOnInit() {
    this.recovery$ = this.store.select(RecoverySelectors.selectRecoveryViewById(this.recoveryId));
  }

  dismiss() {
    this.modalController.dismiss();
  }

}
