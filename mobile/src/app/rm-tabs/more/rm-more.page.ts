import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import * as AuthActions from '../../store/auth/auth.actions';
import { RmOfflinePackService } from '../../core/services/rm/rm-offline-pack.service';
import { RmScopeService } from '../../core/services/rm/rm-scope.service';
import { RmCloseQueueService } from '../../core/services/rm/rm-close-queue.service';
import { RmCloseSyncService } from '../../core/services/rm/rm-close-sync.service';
import { RmContactQueueService } from '../../core/services/rm/rm-contact-queue.service';
import { RmContactSyncService } from '../../core/services/rm/rm-contact-sync.service';
import { RmFieldControlQueueService } from '../../core/services/rm/rm-field-control-queue.service';
import { RmFieldControlSyncService } from '../../core/services/rm/rm-field-control-sync.service';
import { FieldDayPlan, RmOfflinePack } from '../../core/services/rm/rm.models';
import { RmCloseOp } from '../../core/services/rm/rm-close.models';
import { RmContactPatch } from '../../core/services/rm/rm-contact.models';
import { RmFieldControlOp } from '../../core/services/rm/rm-field-control.models';
import { LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-rm-more',
  templateUrl: './rm-more.page.html',
  styleUrls: ['./rm-more.page.scss'],
  standalone: false,
})
export class RmMorePage implements OnInit, OnDestroy {
  plan: FieldDayPlan | null = null;
  pack: RmOfflinePack | null = null;
  pendingOps: RmCloseOp[] = [];
  pendingContacts: RmContactPatch[] = [];
  pendingControls: RmFieldControlOp[] = [];
  private subs: Subscription[] = [];

  constructor(
    private readonly scope: RmScopeService,
    private readonly packService: RmOfflinePackService,
    private readonly closeQueue: RmCloseQueueService,
    private readonly closeSync: RmCloseSyncService,
    private readonly contactQueue: RmContactQueueService,
    private readonly contactSync: RmContactSyncService,
    private readonly fieldControlQueue: RmFieldControlQueueService,
    private readonly fieldControlSync: RmFieldControlSyncService,
    private readonly store: Store,
    private readonly router: Router,
    private readonly loadingCtrl: LoadingController,
    private readonly toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    this.plan = this.scope.getPlan();
    this.pack = this.scope.getPack();
    this.subs.push(
      this.closeQueue.ops$.subscribe(ops => {
        this.pendingOps = ops.filter(o => !o.isSync);
      }),
      this.contactQueue.patches$.subscribe(patches => {
        this.pendingContacts = patches.filter(p => !p.isSync);
      }),
      this.fieldControlQueue.ops$.subscribe(ops => {
        this.pendingControls = ops.filter(o => !o.isSync);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get pendingTotal(): number {
    return this.pendingOps.length + this.pendingContacts.length + this.pendingControls.length;
  }

  async refreshPack(): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: 'Actualisation du pack…', spinner: 'crescent' });
    await loading.present();
    try {
      const result = await this.packService.refreshPack();
      this.pack = result.pack;
      this.plan = this.scope.getPlan();
      await loading.dismiss();
      await this.toast('Pack actualisé', 'success');
    } catch (e: any) {
      await loading.dismiss();
      await this.toast(e?.message || 'Échec actualisation', 'danger');
    }
  }

  async syncPending(): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: 'Synchronisation…', spinner: 'crescent' });
    await loading.present();
    try {
      const contacts = await this.contactSync.syncPending();
      const controls = await this.fieldControlSync.syncPending();
      const closes = await this.closeSync.syncPending();
      await loading.dismiss();
      const synced = contacts.synced + controls.synced + closes.synced;
      const failed = contacts.failed + controls.failed + closes.failed;
      const firstError = contacts.errors[0] || controls.errors[0] || closes.errors[0];
      if (failed === 0) {
        await this.toast(`${synced} opération(s) synchronisée(s)`, 'success');
      } else {
        await this.toast(
          `${synced} OK · ${failed} échec(s)${firstError ? ' — ' + firstError : ''}`,
          'warning'
        );
      }
    } catch (e: any) {
      await loading.dismiss();
      await this.toast(e?.message || 'Échec sync', 'danger');
    }
  }

  async changePlan(): Promise<void> {
    await this.scope.clear();
    await this.router.navigateByUrl('/rm/plan');
  }

  logout(): void {
    void this.scope.clear();
    void this.closeQueue.clearAll();
    void this.contactQueue.clearAll();
    void this.fieldControlQueue.clearAll();
    this.store.dispatch(AuthActions.logout());
  }

  formatOp(op: RmCloseOp): string {
    const kind = op.isPartial ? 'Partiel' : 'Total';
    const amount = new Intl.NumberFormat('fr-FR').format(Math.round(op.amount || 0));
    return `${kind} · ${amount} FCFA`;
  }

  private async toast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2800, color, position: 'top' });
    await t.present();
  }
}
