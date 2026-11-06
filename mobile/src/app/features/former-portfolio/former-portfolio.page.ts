import { Component } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { FormerPortfolioApiService } from './former-portfolio-api.service';
import { FormerPortfolioRepository } from './former-portfolio.repository';
import {
  FormerAgencySaleRow,
  FormerCreditRow,
  FormerCreditTimelineRow,
  FormerTontineCollectionRow,
  FormerTontineMemberRow
} from './former-portfolio.models';

interface AgencyGroup {
  clientId: number;
  clientCode: string;
  firstname: string;
  lastname: string;
  phone: string;
  quarter: string;
  total: number;
  sales: FormerAgencySaleRow[];
}

@Component({
  selector: 'app-former-portfolio',
  templateUrl: './former-portfolio.page.html',
  styleUrls: ['./former-portfolio.page.scss']
})
export class FormerPortfolioPage implements ViewWillEnter {
  tab: 'tontine' | 'credit' | 'agence' = 'tontine';
  loading = false;
  notice = '';
  members: FormerTontineMemberRow[] = [];
  credits: FormerCreditRow[] = [];
  agency: AgencyGroup[] = [];
  selectedMember: FormerTontineMemberRow | null = null;
  collections: FormerTontineCollectionRow[] = [];
  selectedCredit: FormerCreditRow | null = null;
  timelines: FormerCreditTimelineRow[] = [];
  selectedAgency: AgencyGroup | null = null;

  constructor(
    private readonly auth: AuthService,
    private readonly api: FormerPortfolioApiService,
    private readonly repository: FormerPortfolioRepository
  ) {}

  ionViewWillEnter(): void {
    void this.refresh(true);
  }

  async refresh(silent = false): Promise<void> {
    const commercial = this.auth.currentUser?.username;
    if (!commercial) {
      this.notice = 'Session commerciale introuvable.';
      return;
    }
    this.loading = true;
    this.notice = '';
    try {
      const payload = await this.api.sync();
      await this.repository.replace(commercial, payload);
    } catch {
      if (!silent) {
        this.notice = 'Réseau indisponible. Les dossiers déjà enregistrés sur le téléphone restent consultables.';
      }
    }
    await this.reload(commercial);
    this.loading = false;
  }

  async openMember(member: FormerTontineMemberRow): Promise<void> {
    const commercial = this.auth.currentUser?.username;
    if (!commercial) {
      return;
    }
    this.selectedMember = member;
    this.collections = await this.repository.collectionsOf(commercial, member.memberId);
  }

  async openCredit(credit: FormerCreditRow): Promise<void> {
    const commercial = this.auth.currentUser?.username;
    if (!commercial) {
      return;
    }
    this.selectedCredit = credit;
    this.timelines = await this.repository.timelinesOf(commercial, credit.creditId);
  }

  openAgency(group: AgencyGroup): void {
    this.selectedAgency = group;
  }

  closeDetail(): void {
    this.selectedMember = null;
    this.selectedCredit = null;
    this.selectedAgency = null;
    this.collections = [];
    this.timelines = [];
  }

  name(row: { firstname?: string; lastname?: string }): string {
    return `${row.firstname ?? ''} ${row.lastname ?? ''}`.trim();
  }

  private async reload(commercial: string): Promise<void> {
    this.members = await this.repository.listMembers(commercial);
    this.credits = await this.repository.listCredits(commercial);
    const sales = await this.repository.listAgencySales(commercial);
    const groups = new Map<number, AgencyGroup>();
    for (const sale of sales) {
      const current = groups.get(sale.clientId) ?? {
        clientId: sale.clientId,
        clientCode: sale.clientCode,
        firstname: sale.firstname,
        lastname: sale.lastname,
        phone: sale.phone,
        quarter: sale.quarter,
        total: 0,
        sales: []
      };
      current.sales.push(sale);
      current.total += Number(sale.totalAmount ?? 0);
      groups.set(sale.clientId, current);
    }
    this.agency = Array.from(groups.values());
  }
}
