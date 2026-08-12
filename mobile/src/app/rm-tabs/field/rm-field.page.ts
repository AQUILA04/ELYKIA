import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { RmScopeService } from '../../core/services/rm/rm-scope.service';
import { RmCreditLate, RmPackTontineMember } from '../../core/services/rm/rm.models';
import { RmTontineFieldControlSheetComponent } from '../../features/rm/tontine-field-control/rm-tontine-field-control-sheet.component';

@Component({
  selector: 'app-rm-field',
  templateUrl: './rm-field.page.html',
  styleUrls: ['./rm-field.page.scss'],
  standalone: false,
})
export class RmFieldPage implements OnInit {
  byCommercial: { commercial: string; quarters: { quarter: string; items: RmCreditLate[] }[] }[] = [];
  tontineByCommercial: {
    commercial: string;
    quarters: { quarter: string; items: RmPackTontineMember[] }[];
  }[] = [];

  constructor(
    private readonly scope: RmScopeService,
    private readonly modalCtrl: ModalController
  ) {}

  ngOnInit(): void {
    this.loadLateCredits();
    this.loadTontineMembers();
  }

  private loadLateCredits(): void {
    const lates = this.scope.getPack()?.lateCredits ?? [];
    const commercialMap = new Map<string, RmCreditLate[]>();
    for (const item of lates) {
      const c = item.collector || '—';
      if (!commercialMap.has(c)) {
        commercialMap.set(c, []);
      }
      commercialMap.get(c)!.push(item);
    }
    this.byCommercial = Array.from(commercialMap.entries()).map(([commercial, items]) => {
      const qMap = new Map<string, RmCreditLate[]>();
      for (const item of items) {
        const q = item.clientQuarter?.trim() || 'Non spécifié';
        if (!qMap.has(q)) {
          qMap.set(q, []);
        }
        qMap.get(q)!.push(item);
      }
      return {
        commercial,
        quarters: Array.from(qMap.entries()).map(([quarter, qItems]) => ({ quarter, items: qItems }))
      };
    });
  }

  private loadTontineMembers(): void {
    const members = this.scope.getPack()?.tontineMembers ?? [];
    const commercialMap = new Map<string, RmPackTontineMember[]>();
    for (const item of members) {
      const c = item.tontineCollector || '—';
      if (!commercialMap.has(c)) {
        commercialMap.set(c, []);
      }
      commercialMap.get(c)!.push(item);
    }
    this.tontineByCommercial = Array.from(commercialMap.entries()).map(([commercial, items]) => {
      const qMap = new Map<string, RmPackTontineMember[]>();
      for (const item of items) {
        const q = item.clientQuarter?.trim() || 'Non spécifié';
        if (!qMap.has(q)) {
          qMap.set(q, []);
        }
        qMap.get(q)!.push(item);
      }
      return {
        commercial,
        quarters: Array.from(qMap.entries()).map(([quarter, qItems]) => ({ quarter, items: qItems }))
      };
    });
  }

  openMaps(item: RmCreditLate): void {
    const client = this.scope.getPack()?.clients?.find(c => c.id === item.clientId);
    const url = client?.mll
      || (client?.latitude != null && client?.longitude != null
        ? `https://www.google.com/maps/search/?api=1&query=${client.latitude},${client.longitude}`
        : null);
    if (url) {
      window.open(url, '_blank');
    }
  }

  async openTontineControl(member: RmPackTontineMember): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: RmTontineFieldControlSheetComponent,
      componentProps: { member },
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.95
    });
    await modal.present();
    await modal.onDidDismiss();
    this.loadTontineMembers();
  }

  controlStatus(member: RmPackTontineMember): string | null {
    const controls = this.scope.getPack()?.tontineFieldControlsToday ?? [];
    const found = controls.find(c => c.tontineMemberId === member.id);
    return found?.status ?? null;
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(value || 0));
  }
}
