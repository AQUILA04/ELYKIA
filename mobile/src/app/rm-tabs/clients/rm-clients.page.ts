import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { RmScopeService } from '../../core/services/rm/rm-scope.service';
import { RmPackClient } from '../../core/services/rm/rm.models';
import { RmClientEditSheetComponent } from '../../features/rm/client-edit/rm-client-edit-sheet.component';
import { RmCollectorAssignSheetComponent } from '../../features/rm/collector-assign/rm-collector-assign-sheet.component';

@Component({
  selector: 'app-rm-clients',
  templateUrl: './rm-clients.page.html',
  styleUrls: ['./rm-clients.page.scss'],
  standalone: false,
})
export class RmClientsPage implements OnInit, OnDestroy {
  clients: RmPackClient[] = [];
  query = '';
  selectedIds = new Set<number>();
  private failedAvatars = new Set<number>();
  private sub?: Subscription;

  constructor(
    private readonly scope: RmScopeService,
    private readonly modalCtrl: ModalController
  ) {}

  ngOnInit(): void {
    this.sub = this.scope.pack$.subscribe(pack => {
      this.clients = pack?.clients ?? [];
      this.failedAvatars.clear();
      const valid = new Set(this.clients.map(c => c.id));
      this.selectedIds = new Set([...this.selectedIds].filter(id => valid.has(id)));
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get filtered(): RmPackClient[] {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      return this.clients;
    }
    return this.clients.filter(c =>
      (c.fullName || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.quarter || '').toLowerCase().includes(q)
    );
  }

  get isAllSelected(): boolean {
    return this.filtered.length > 0 && this.filtered.every(c => this.selectedIds.has(c.id));
  }

  isSelected(clientId: number): boolean {
    return this.selectedIds.has(clientId);
  }

  toggleSelection(clientId: number, event?: CustomEvent<{ checked?: boolean }>): void {
    const checked = event?.detail?.checked;
    const next = new Set(this.selectedIds);
    if (typeof checked === 'boolean') {
      if (checked) {
        next.add(clientId);
      } else {
        next.delete(clientId);
      }
    } else if (next.has(clientId)) {
      next.delete(clientId);
    } else {
      next.add(clientId);
    }
    this.selectedIds = next;
  }

  toggleAllSelection(event?: CustomEvent<{ checked?: boolean }>): void {
    const checked = event?.detail?.checked ?? !this.isAllSelected;
    const next = new Set(this.selectedIds);
    if (checked) {
      this.filtered.forEach(c => next.add(c.id));
    } else {
      this.filtered.forEach(c => next.delete(c.id));
    }
    this.selectedIds = next;
  }

  hasGeo(c: RmPackClient): boolean {
    return c.latitude != null && c.longitude != null;
  }

  avatarUrl(c: RmPackClient): string | null {
    if (this.failedAvatars.has(c.id)) {
      return null;
    }
    if (c.profilPhotoThumbUrl) {
      return c.profilPhotoThumbUrl;
    }
    if (c.profilPhotoUrl?.includes('original.jpg')) {
      return c.profilPhotoUrl.replace('original.jpg', 'thumb.jpg');
    }
    return c.profilPhotoUrl || null;
  }

  initials(c: RmPackClient): string {
    const first = (c.firstname || c.fullName || '?').trim().charAt(0);
    const last = (c.lastname || '').trim().charAt(0);
    return (first + last).toUpperCase() || '?';
  }

  onAvatarError(clientId: number): void {
    this.failedAvatars.add(clientId);
  }

  async openEdit(client: RmPackClient): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: RmClientEditSheetComponent,
      componentProps: { client },
      cssClass: 'rm-close-modal'
    });
    await modal.present();
  }

  async openBulkAssign(): Promise<void> {
    const selected = this.clients.filter(c => this.selectedIds.has(c.id));
    if (!selected.length) {
      return;
    }
    const modal = await this.modalCtrl.create({
      component: RmCollectorAssignSheetComponent,
      componentProps: { clients: selected },
      cssClass: 'rm-close-modal'
    });
    await modal.present();
    const { role } = await modal.onDidDismiss();
    if (role === 'confirm') {
      this.selectedIds = new Set();
    }
  }
}
