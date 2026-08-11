import { Component, OnInit } from '@angular/core';
import { RmScopeService } from '../../core/services/rm/rm-scope.service';
import { RmCreditLate } from '../../core/services/rm/rm.models';

@Component({
  selector: 'app-rm-field',
  templateUrl: './rm-field.page.html',
  styleUrls: ['./rm-field.page.scss'],
  standalone: false,
})
export class RmFieldPage implements OnInit {
  byCommercial: { commercial: string; quarters: { quarter: string; items: RmCreditLate[] }[] }[] = [];

  constructor(private readonly scope: RmScopeService) {}

  ngOnInit(): void {
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

  formatAmount(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(value || 0));
  }
}
