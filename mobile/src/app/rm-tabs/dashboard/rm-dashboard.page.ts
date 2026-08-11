import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { RmScopeService } from '../../core/services/rm/rm-scope.service';
import { RmCloseQueueService } from '../../core/services/rm/rm-close-queue.service';
import { RmCreditLate, RmOfflinePack, FieldDayPlan } from '../../core/services/rm/rm.models';
import { RmCloseSheetComponent } from '../../features/rm/close/rm-close-sheet.component';
import { RmFieldControlSheetComponent } from '../../features/rm/field-control/rm-field-control-sheet.component';

@Component({
  selector: 'app-rm-dashboard',
  templateUrl: './rm-dashboard.page.html',
  styleUrls: ['./rm-dashboard.page.scss'],
  standalone: false,
})
export class RmDashboardPage implements OnInit, OnDestroy {
  plan: FieldDayPlan | null = null;
  pack: RmOfflinePack | null = null;
  grouped: { quarter: string; items: RmCreditLate[] }[] = [];
  filterCommercial = '';
  pendingCloses = 0;
  closedTodayAmount = 0;
  private controlByCredit = new Map<number, string>();
  private subs: Subscription[] = [];

  constructor(
    private readonly scope: RmScopeService,
    private readonly closeQueue: RmCloseQueueService,
    private readonly modalCtrl: ModalController,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.scope.pack$.subscribe(pack => {
        this.pack = pack;
        this.plan = this.scope.getPlan();
        this.refreshControlIndex();
        this.rebuild();
      }),
      this.closeQueue.ops$.subscribe(ops => {
        this.pendingCloses = ops.filter(o => !o.isSync).length;
        this.closedTodayAmount = ops
          .filter(o => o.createdAt?.slice(0, 10) === new Date().toISOString().slice(0, 10))
          .reduce((s, o) => s + (o.amount || 0), 0);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get lateCount(): number {
    return this.filteredLates().length;
  }

  get totalDue(): number {
    return this.filteredLates().reduce((s, c) => s + (c.totalAmountRemaining || 0), 0);
  }

  setCommercialFilter(username: string): void {
    this.filterCommercial = username;
    this.rebuild();
  }

  openPlan(): void {
    void this.router.navigateByUrl('/rm/plan');
  }

  controlStatus(creditId: number): string | null {
    return this.controlByCredit.get(creditId) || null;
  }

  async openClose(item: RmCreditLate, event?: Event): Promise<void> {
    event?.stopPropagation();
    const modal = await this.modalCtrl.create({
      component: RmCloseSheetComponent,
      componentProps: { credit: item },
      cssClass: 'rm-close-modal'
    });
    await modal.present();
    await modal.onDidDismiss();
  }

  async openFieldControl(item: RmCreditLate, event?: Event): Promise<void> {
    event?.stopPropagation();
    const modal = await this.modalCtrl.create({
      component: RmFieldControlSheetComponent,
      componentProps: { credit: item },
      cssClass: 'rm-close-modal'
    });
    await modal.present();
    await modal.onDidDismiss();
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(value || 0));
  }

  private filteredLates(): RmCreditLate[] {
    const items = this.pack?.lateCredits ?? [];
    if (!this.filterCommercial) {
      return items;
    }
    return items.filter(i => i.collector === this.filterCommercial);
  }

  private refreshControlIndex(): void {
    this.controlByCredit.clear();
    const controls = this.pack?.creditFieldControlsToday;
    if (!Array.isArray(controls)) {
      return;
    }
    for (const c of controls as any[]) {
      if (c?.creditId != null && c?.status) {
        this.controlByCredit.set(Number(c.creditId), String(c.status));
      }
    }
  }

  private rebuild(): void {
    const map = new Map<string, RmCreditLate[]>();
    for (const item of this.filteredLates()) {
      const q = item.clientQuarter?.trim() || 'Non spécifié';
      if (!map.has(q)) {
        map.set(q, []);
      }
      map.get(q)!.push(item);
    }
    this.grouped = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([quarter, items]) => ({ quarter, items }));
  }
}
