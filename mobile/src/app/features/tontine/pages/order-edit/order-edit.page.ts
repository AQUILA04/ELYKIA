import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoadingController, ModalController, NavController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { TontineMemberRepository } from 'src/app/core/repositories/tontine-member.repository';
import { TontineCollectionRepository } from 'src/app/core/repositories/tontine-collection.repository';
import { ClientRepository } from 'src/app/core/repositories/client.repository';
import { TontineDeliveryRepository } from 'src/app/core/repositories/tontine-delivery.repository';
import { TontineWriteService } from 'src/app/core/services/tontine-write.service';
import { FeedbackService } from 'src/app/core/services/feedback.service';
import { TontineOrderCeilingService } from 'src/app/core/services/tontine-order-ceiling.service';
import { TontineDelivery, TontineDeliveryItem, TontineMember } from 'src/app/models/tontine.model';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import { selectTontineSession } from 'src/app/store/tontine/tontine.selectors';
import {
  canMarkTontineDeliveryAsDelivered,
  normalizeTontineStatus,
  pickMemberTontineDelivery
} from 'src/app/core/utils/tontine-delivery-status.util';
import {
  addTontineLinePick,
  displayedTontineDeliveryQuantity,
  stepTontineDeliveryItem,
  tontineQuantitiesByArticle
} from 'src/app/core/utils/tontine-delivery-item-quantity.util';
import {
  TontineOrderCeiling,
  formatFcfa,
  tontineCeilingExceededMessage,
  tontineCeilingExcess
} from 'src/app/core/utils/tontine-order-ceiling.util';
import {
  TontineOrderBalance,
  computeTontineOrderBalance,
  tontineOrderBalanceLabels
} from 'src/app/core/utils/tontine-order-balance.util';
import { normalizePlannedDate } from 'src/app/core/utils/tontine-planned-date.util';
import { isNetworkError } from 'src/app/core/utils/user-error-message.util';
import {
  TontineArticlePick,
  TontineArticlePickerModalComponent
} from 'src/app/shared/components/tontine-article-picker-modal/tontine-article-picker-modal.component';
import { TontineOrderEditOutcomeService } from './tontine-order-edit-outcome.service';

type EditLine = TontineDeliveryItem & { articleName?: string };

/**
 * Modification d'une commande tontine non livrée, sur une page à part : la fiche membre reste
 * en lecture seule. Quantités, ajout d'article (stock tontine ou catalogue), plafond contrôlé
 * avant l'appel au serveur. La modification se fait en ligne (PUT /deliveries/{id}/items).
 */
@Component({
  selector: 'app-tontine-order-edit',
  templateUrl: './order-edit.page.html',
  styleUrls: ['./order-edit.page.scss'],
  standalone: false
})
export class OrderEditPage implements OnInit {
  loading = true;
  saving = false;
  member: TontineMember | null = null;
  clientName = '';
  delivery: TontineDelivery | null = null;
  lines: EditLine[] = [];
  ceiling: TontineOrderCeiling | null = null;
  /** Commande pas encore envoyée au serveur : modification impossible tant qu'elle n'est pas synchronisée. */
  notSynced = false;
  /** Commande introuvable ou déjà livrée : rien à modifier. */
  unavailableReason: string | null = null;

  /** Date de livraison prévue (AAAA-MM-JJ), modifiable tant que la commande n'est pas livrée. */
  plannedDate: string | null = null;
  private originalPlannedDate: string | null = null;

  private memberId: string | null = null;
  private commercialUsername = '';
  private sessionId: string | null = null;
  private originalSignature = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly navCtrl: NavController,
    private readonly loadingCtrl: LoadingController,
    private readonly modalCtrl: ModalController,
    private readonly store: Store,
    private readonly memberRepo: TontineMemberRepository,
    private readonly collectionRepo: TontineCollectionRepository,
    private readonly clientRepo: ClientRepository,
    private readonly deliveryRepo: TontineDeliveryRepository,
    private readonly tontineWriteService: TontineWriteService,
    private readonly feedback: FeedbackService,
    private readonly ceilingService: TontineOrderCeilingService,
    private readonly outcome: TontineOrderEditOutcomeService
  ) {}

  async ngOnInit(): Promise<void> {
    this.memberId = this.route.snapshot.paramMap.get('memberId');
    await this.load();
  }

  get total(): number {
    return this.lines.reduce((sum, line) => sum + (line.totalPrice || 0), 0);
  }

  get balance(): TontineOrderBalance | null {
    return this.member ? computeTontineOrderBalance(this.member.availableContribution, this.total) : null;
  }

  get labels() {
    return tontineOrderBalanceLabels(false);
  }

  get ceilingExcess(): number {
    return this.ceiling ? tontineCeilingExcess(this.total, this.ceiling.ceiling) : 0;
  }

  get dateChanged(): boolean {
    return this.plannedDate !== this.originalPlannedDate;
  }

  get changed(): boolean {
    return this.signature(this.lines) !== this.originalSignature || this.dateChanged;
  }

  onPlannedDateChange(value: string | null): void {
    this.plannedDate = normalizePlannedDate(value);
  }

  get canSave(): boolean {
    return !!this.delivery && !this.unavailableReason && !this.notSynced && !this.saving
      && this.lines.length > 0 && this.ceilingExcess <= 0 && this.changed;
  }

  formatCurrency(amount: number | null | undefined): string {
    return formatFcfa(amount);
  }

  displayedQuantity(line: EditLine): number {
    return displayedTontineDeliveryQuantity(line);
  }

  canDecrease(line: EditLine): boolean {
    return displayedTontineDeliveryQuantity(line) > 1 || this.lines.length > 1;
  }

  change(line: EditLine, delta: number): void {
    const next = stepTontineDeliveryItem(line, delta);
    if (next === null) {
      if (this.lines.length <= 1) {
        return;
      }
      this.lines = this.lines.filter(current => current !== line);
      return;
    }
    this.lines = this.lines.map(current => current === line ? next : current);
  }

  async addArticle(): Promise<void> {
    if (!this.delivery) {
      return;
    }
    const picker = await this.modalCtrl.create({
      component: TontineArticlePickerModalComponent,
      componentProps: {
        mode: 'order',
        commercialUsername: this.commercialUsername,
        sessionId: this.sessionId,
        quantitiesInOrder: tontineQuantitiesByArticle(this.lines),
        remainingUnderCeiling: this.ceiling ? Math.max(0, this.ceiling.ceiling - this.total) : null
      }
    });
    await picker.present();
    const { data, role } = await picker.onDidDismiss<TontineArticlePick>();
    if (role === 'pick' && data) {
      this.applyPick(data);
    }
  }

  applyPick(pick: TontineArticlePick): void {
    if (this.delivery) {
      this.lines = addTontineLinePick(this.lines, pick, this.delivery.id);
    }
  }

  async save(): Promise<void> {
    if (!this.delivery || !this.memberId) {
      return;
    }
    if (this.lines.length === 0) {
      await this.feedback.warning('La commande doit contenir au moins un article.', { title: 'Commande vide' });
      return;
    }
    if (this.ceiling && this.ceilingExcess > 0) {
      await this.feedback.error(tontineCeilingExceededMessage(this.total, this.ceiling.ceiling), { title: 'Plafond dépassé' });
      return;
    }
    this.saving = true;
    const loading = await this.loadingCtrl.create({ message: 'Enregistrement…', backdropDismiss: false });
    await loading.present();
    let saved: number;
    try {
      saved = await this.tontineWriteService.replaceDeliveryItems(
        this.delivery,
        this.lines,
        this.dateChanged ? { plannedDeliveryDate: this.plannedDate } : undefined
      );
    } catch (error: unknown) {
      await loading.dismiss();
      this.saving = false;
      await this.feedback.error(error, {
        title: isNetworkError(error) ? 'Pas de connexion' : 'Commande non modifiée',
        fallback: 'La commande n\'a pas pu être modifiée. Elle reste inchangée.'
      });
      return;
    }
    // Chargement fermé avant toute fenêtre : il ne doit jamais rester affiché.
    await loading.dismiss();
    this.saving = false;
    this.originalSignature = this.signature(this.lines);
    this.originalPlannedDate = this.plannedDate;
    const role = await this.feedback.success(`Nouveau total : ${formatFcfa(saved)}.`, {
      title: 'Commande mise à jour',
      actions: [
        { role: 'close', text: 'Fermer' },
        { role: 'receipt', text: 'Voir le reçu', primary: true }
      ]
    });
    if (role === 'receipt') {
      this.outcome.requestReceipt(this.memberId);
    }
    this.navCtrl.back();
  }

  async cancel(): Promise<void> {
    if (this.changed && !this.unavailableReason) {
      const leave = await this.feedback.confirm('Les modifications de la commande ne seront pas enregistrées.', {
        title: 'Abandonner les modifications ?',
        confirmText: 'Abandonner',
        cancelText: 'Continuer'
      });
      if (!leave) {
        return;
      }
    }
    this.navCtrl.back();
  }

  private async load(): Promise<void> {
    this.loading = true;
    try {
      const user = await firstValueFrom(this.store.select(selectAuthUser).pipe(take(1)));
      this.commercialUsername = user?.username ?? '';
      const session = await firstValueFrom(this.store.select(selectTontineSession).pipe(take(1)));
      this.sessionId = session?.id ?? null;

      const members = await this.memberRepo.findAll();
      this.member = members.find(m => String(m.id) === String(this.memberId)) || null;
      if (!this.member || !this.commercialUsername) {
        this.unavailableReason = 'Membre introuvable sur cette tablette. Synchronisez puis réessayez.';
        return;
      }
      const client = await this.clientRepo.findById(this.member.clientId);
      this.clientName = client?.fullName
        || `${client?.firstname || ''} ${client?.lastname || ''}`.trim()
        || 'Membre';

      const deliveries = await this.deliveryRepo.getByMemberAndCommercial(this.member.id, this.commercialUsername);
      this.delivery = pickMemberTontineDelivery(deliveries, this.member.deliveryStatus);
      if (!this.delivery
        || normalizeTontineStatus(this.member.deliveryStatus) === 'DELIVERED'
        || !canMarkTontineDeliveryAsDelivered(this.delivery.status)) {
        this.unavailableReason = 'Cette commande est déjà livrée ou n\'existe plus : elle ne peut pas être modifiée.';
        return;
      }
      this.lines = (this.delivery.items || []).map(item => ({ ...item }));
      if (this.lines.length === 0) {
        this.unavailableReason = 'Les articles de cette commande ne sont pas encore sur la tablette. Lancez une synchronisation.';
        return;
      }
      this.originalSignature = this.signature(this.lines);
      this.plannedDate = normalizePlannedDate(this.delivery.plannedDeliveryDate);
      this.originalPlannedDate = this.plannedDate;
      this.notSynced = !(await this.hasServerId(this.delivery));

      const collections = await this.collectionRepo.getByMemberId(this.member.id);
      this.ceiling = await this.ceilingService.forMember(this.member, session, collections);
    } catch (error) {
      console.error('Commande tontine indisponible', error);
      this.unavailableReason = 'La commande n\'a pas pu être chargée.';
    } finally {
      this.loading = false;
    }
  }

  private async hasServerId(delivery: TontineDelivery): Promise<boolean> {
    if (/^\d+$/.test(String(delivery.id))) {
      return true;
    }
    try {
      return !!(await this.deliveryRepo.getServerId(delivery.id, 'tontine-delivery'));
    } catch {
      return false;
    }
  }

  private signature(lines: EditLine[]): string {
    return lines
      .map(line => `${line.articleId}|${line.salePackMode || 'UNIT'}|${line.quantity}`)
      .sort((a, b) => a.localeCompare(b))
      .join(';');
  }
}
