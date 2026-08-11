import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { RmScopeService } from '../../core/services/rm/rm-scope.service';
import { RmPackClient } from '../../core/services/rm/rm.models';
import { RmClientEditSheetComponent } from '../../features/rm/client-edit/rm-client-edit-sheet.component';

@Component({
  selector: 'app-rm-clients',
  templateUrl: './rm-clients.page.html',
  styleUrls: ['./rm-clients.page.scss'],
  standalone: false,
})
export class RmClientsPage implements OnInit, OnDestroy {
  clients: RmPackClient[] = [];
  query = '';
  private sub?: Subscription;

  constructor(
    private readonly scope: RmScopeService,
    private readonly modalCtrl: ModalController
  ) {}

  ngOnInit(): void {
    this.sub = this.scope.pack$.subscribe(pack => {
      this.clients = pack?.clients ?? [];
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

  hasGeo(c: RmPackClient): boolean {
    return c.latitude != null && c.longitude != null;
  }

  async openEdit(client: RmPackClient): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: RmClientEditSheetComponent,
      componentProps: { client },
      cssClass: 'rm-close-modal'
    });
    await modal.present();
  }
}
