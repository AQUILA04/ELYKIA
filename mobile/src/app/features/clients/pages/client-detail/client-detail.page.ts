import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import * as ClientSelectors from '../../../../store/client/client.selectors';
import { Observable, of, from, Subject, merge, combineLatest } from 'rxjs';
import { switchMap, map, catchError, filter, take, tap, takeUntil } from 'rxjs/operators';
// Removed redundant import since we're importing everything as ClientSelectors
// import { selectClientViewById } from '../../../../store/client/client.selectors';
import { selectDistributionsByClientId } from '../../../../store/distribution/distribution.selectors';
import { selectTransactionsByClientId, selectTransactionPaginationHasMore, selectTransactionCurrentPage } from '../../../../store/transaction/transaction.selectors';
import { loadClients } from '../../../../store/client/client.actions';
import { DatePipe } from '@angular/common';
import { loadTransactionsByClient } from '../../../../store/transaction/transaction.actions';
import { AlertController, ModalController, PopoverController, ToastController } from '@ionic/angular';
import { MapPreviewComponent } from '../../../../shared/components/map-preview/map-preview.component';
import { ImagePreviewComponent } from 'src/app/shared/components/image-preview/image-preview.component';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Actions, ofType } from '@ngrx/effects';
import { PhotoEditModalComponent } from '../../components/photo-edit-modal/photo-edit-modal.component';
import { LocationUpdateComponent } from 'src/app/shared/components/location-update/location-update.component';
import { ClientMenuComponent } from '../../components/client-menu/client-menu.component';
import * as ClientActions from '../../../../store/client/client.actions';
import * as AccountActions from '../../../../store/account/account.actions';
import { Capacitor } from '@capacitor/core';
import { ThumbnailService } from '../../../../core/services/thumbnail.service';

@Component({
  selector: 'app-client-detail',
  templateUrl: './client-detail.page.html',
  styleUrls: ['./client-detail.page.scss'],
  standalone: false
})
export class ClientDetailPage implements OnInit, OnDestroy {
  selectedTab = 'informations';
  client$!: Observable<any>;
  credits$!: Observable<any[]>;
  history$!: Observable<any[]>;
  hasMoreTransactions$!: Observable<boolean>;
  clientId: string | null = null;
  today = new Date();
  private basePath: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private datePipe: DatePipe,
    private modalController: ModalController,
    private sanitizer: DomSanitizer,
    private popoverController: PopoverController,
    private alertController: AlertController,
    private toastController: ToastController,
    private actions$: Actions,
    private thumbnailService: ThumbnailService,
    private cdr: ChangeDetectorRef
  ) { }

  async ngOnInit() {
    try {
      const { uri } = await Filesystem.getUri({
        path: '',
        directory: Directory.ExternalStorage
      });
      this.basePath = uri;
      this.cdr.markForCheck();
    } catch (e) {
      console.warn('Error getting base path:', e);
    }

    this.clientId = this.route.snapshot.paramMap.get('id');
    if (this.clientId) {
      this.store.dispatch(loadTransactionsByClient({ clientId: this.clientId, page: 0, size: 20 }));
      this.initObservables(this.clientId);
      this.setupActionListeners();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initObservables(clientId: string) {
    this.client$ = this.store.select(ClientSelectors.selectClientViewById(clientId)).pipe(
      switchMap(client => {
        if (!client) {
          this.store.select(ClientSelectors.selectAllClients).pipe(take(1)).subscribe(clients => {
            if (!Array.isArray(clients) || !(clients as any[]).some(c => String(c.id) === String(clientId))) {
              this.store.dispatch(loadClients({ commercialUsername: 'COM003' })); // Fallback
            }
          });
          return of(null);
        }
        // Combine photo loading observables
        // Use optimized getPhotoUrl which returns SafeUrl directly
        const profilePhoto = this.getPhotoUrl(client.profilPhoto || client.profilPhotoUrl);
        const cardPhoto = this.getPhotoUrl(client.cardPhoto || client.cardPhotoUrl);

        return of({
            ...client,
            photoUrl: profilePhoto,
            cardPhotoSafeUrl: cardPhoto
        });
      }),
      filter(client => client !== null) // Ne pas émettre si le client est null
    );

    this.credits$ = this.store.select(selectDistributionsByClientId(clientId));
    this.history$ = this.store.select(selectTransactionsByClientId(clientId));
    this.hasMoreTransactions$ = this.store.select(selectTransactionPaginationHasMore);
  }

  loadMoreTransactions(event: any) {
    if (!this.clientId) return;
    this.store.select(selectTransactionCurrentPage).pipe(take(1)).subscribe(currentPage => {
      this.store.dispatch(loadTransactionsByClient({ clientId: this.clientId!, page: currentPage + 1, size: 20 }));
      setTimeout(() => event.target.complete(), 500);
    });
  }

  private setupActionListeners() {
    const updateAccountSuccess$ = this.actions$.pipe(ofType(AccountActions.updateAccountSuccess));
    const updateBalanceFailure$ = this.actions$.pipe(ofType(ClientActions.updateClientBalanceFailure));
    const updateLocationSuccess$ = this.actions$.pipe(ofType(ClientActions.updateClientLocationSuccess));
    const updateLocationFailure$ = this.actions$.pipe(ofType(ClientActions.updateClientLocationFailure));
    const deleteClientSuccess$ = this.actions$.pipe(ofType(ClientActions.deleteClientSuccess));
    const deleteClientFailure$ = this.actions$.pipe(ofType(ClientActions.deleteClientFailure));

    merge(updateAccountSuccess$, updateBalanceFailure$, updateLocationSuccess$, updateLocationFailure$, deleteClientSuccess$, deleteClientFailure$)
      .pipe(takeUntil(this.destroy$))
      .subscribe(action => {
        if (AccountActions.updateAccountSuccess.type === action.type) {
          this.presentToast('Solde modifié avec succès.', 'success', 'top');
        } else if (ClientActions.updateClientBalanceFailure.type === action.type) {
          this.presentToast('Erreur lors de la modification du solde.', 'danger', 'top');
        } else if (ClientActions.updateClientLocationSuccess.type === action.type) {
          this.presentToast('Localisation modifiée avec succès.', 'success', 'top');
        } else if (ClientActions.updateClientLocationFailure.type === action.type) {
          this.presentToast('Erreur lors de la modification de la localisation.', 'danger', 'top');
        } else if (ClientActions.deleteClientSuccess.type === action.type) {
          this.presentToast('Client supprimé avec succès.', 'success', 'top');
          this.router.navigate(['/tabs/clients']);
        } else if (ClientActions.deleteClientFailure.type === action.type) {
          this.presentToast(`Erreur lors de la suppression du client: ${action.error}`, 'danger', 'top');
        }
      });
  }

  goToRecouvrement(credit: any) {
    this.router.navigate(['/recouvrement', credit.id]);
  }

  getDisplayDate(credit: any): string {
    const endDate = new Date(credit.endDate);
    if (this.today > endDate) {
      return this.datePipe.transform(endDate, 'dd/MM/yy') || '';
    }
    return this.datePipe.transform(this.today, 'dd/MM/yy') || '';
  }

  async openMapPreview(client: any) {
    const modal = await this.modalController.create({
      component: MapPreviewComponent,
      cssClass: 'map-preview-modal',
      componentProps: { lat: client.latitude, lng: client.longitude, mll: client.mll, fullName: client.fullName, address: client.address, quarter: client.quarter }
    });
    return await modal.present();
  }

  async openImagePreview(imageUrl: string, fullName: string) {
    const modal = await this.modalController.create({
      component: ImagePreviewComponent,
      cssClass: 'image-preview-modal',
      componentProps: { imageUrl, fullName }
    });
    return await modal.present();
  }

  onAvatarClick(client: any) {
    if (client.photoUrl && !client.photoUrl.toString().includes('favicon')) {
      this.openImagePreview(client.photoUrl, client.fullName);
    }
  }

  async openCardPreview(client: any) {
    const modal = await this.modalController.create({
      component: ImagePreviewComponent,
      cssClass: 'image-preview-modal',
      componentProps: { imageUrl: client.cardPhotoSafeUrl, fullName: `Pièce d'identité de ${client.fullName}` }
    });
    return await modal.present();
  }

  /**
   * Optimized photo URL retrieval using Capacitor.convertFileSrc.
   * This avoids reading the file into memory (base64) and uses the native WebView rendering.
   */
  private getPhotoUrl(localPath: string | undefined | null): SafeUrl {
    if (!localPath) {
      return this.sanitizer.bypassSecurityTrustUrl('assets/icon/person-circle-outline.svg');
    }

    // Sur le Web, les chemins de fichiers natifs ne fonctionneront pas directement.
    // On retourne l'image par défaut pour éviter les erreurs 404 dans la console,
    // sauf si c'est une URL http ou un asset.
    if (Capacitor.getPlatform() === 'web' && !localPath.startsWith('http') && !localPath.startsWith('assets')) {
      return this.sanitizer.bypassSecurityTrustUrl('assets/icon/person-circle-outline.svg');
    }

    // Si le chemin est déjà une URL complète ou un asset
    if (localPath.startsWith('http') || localPath.startsWith('assets') || localPath.startsWith('file://') || localPath.startsWith('content://')) {
      return this.sanitizer.bypassSecurityTrustUrl(Capacitor.convertFileSrc(localPath));
    }

    // Si c'est un chemin relatif, on a besoin du basePath
    if (!this.basePath) {
      // En attendant que le basePath soit chargé, on affiche l'image par défaut pour éviter les 404
      return this.sanitizer.bypassSecurityTrustUrl('assets/icon/person-circle-outline.svg');
    }

    const finalPath = this.basePath + (localPath.startsWith('/') ? '' : '/') + localPath;
    return this.sanitizer.bypassSecurityTrustUrl(Capacitor.convertFileSrc(finalPath));
  }

  async presentPopover(event: any) {
    const clientId = this.route.snapshot.paramMap.get('id');
    if (!clientId) return;

    this.client$.pipe(take(1)).subscribe(async client => {
      const popover = await this.popoverController.create({
        component: ClientMenuComponent,
        componentProps: {
          clientId: clientId,
          editDisabled: client ? !client.isLocal : true,
          deleteDisabled: client ? !client.isLocal : true,
          updateLocationDisabled: client ? (client.isLocal || !client.isSync) : true,
          updatePhotoDisabled: client ? client.isLocal : true,
        },
        event: event,
        translucent: true
      });

      await popover.present();
      const { data } = await popover.onDidDismiss();
      if (data) this.handleMenuAction(data.action, client);
    });
  }

  private handleMenuAction(action: string, client: any) {
    switch (action) {
      case 'edit': this.editClient(); break;
      case 'delete': this.deleteClient(); break;
      case 'editBalance': this.editBalance(); break;
      case 'updateLocation': this.updateLocation(); break;
      case 'updatePhoto': this.openPhotoEditModal(client); break;
    }
  }

  async openPhotoEditModal(client: any) {
    const modal = await this.modalController.create({ component: PhotoEditModalComponent, componentProps: { client } });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) this.processPhotoUpdate(data, client);
  }

  async processPhotoUpdate(data: any, client: any) {
    try {
      let profilePhotoPath: string | null = client.profilPhoto;
      let profilePhotoThumbPath: string | null = client.profilPhotoThumbUrl;
      let cardPhotoPath: string | null = client.cardPhoto;
      let cardPhotoThumbPath: string | null = client.cardPhotoThumbUrl;

      if (data.newProfilePhoto) {
        profilePhotoPath = `Pictures/Elykia/client_photos/profile_${Date.now()}.png`;

        try {
          await Filesystem.mkdir({ path: 'Pictures/Elykia/client_photos', directory: Directory.ExternalStorage, recursive: true });
        } catch (e) { }

        await Filesystem.writeFile({ path: profilePhotoPath, data: data.newProfilePhoto.base64, directory: Directory.ExternalStorage });

        // Generate thumbnail
        profilePhotoThumbPath = await this.thumbnailService.generateThumbnail(profilePhotoPath, 200, 200);
      }
      if (data.newCardPhoto) {
        cardPhotoPath = `Pictures/Elykia/card_photos/card_${Date.now()}.png`;

        try {
          await Filesystem.mkdir({ path: 'Pictures/Elykia/card_photos', directory: Directory.ExternalStorage, recursive: true });
        } catch (e) { }

        await Filesystem.writeFile({ path: cardPhotoPath, data: data.newCardPhoto.base64, directory: Directory.ExternalStorage });

        // Generate thumbnail
        cardPhotoThumbPath = await this.thumbnailService.generateThumbnail(cardPhotoPath, 200, 200);
      }

      this.store.dispatch(ClientActions.updateClientPhotosAndInfo({
        clientId: client.id,
        cardType: data.cardType,
        cardID: data.cardID,
        profilPhoto: profilePhotoPath,
        cardPhoto: cardPhotoPath,
        profilPhotoUrl: profilePhotoPath, // Initialiser avec le même chemin
        cardPhotoUrl: cardPhotoPath,       // Initialiser avec le même chemin
        profilPhotoThumbUrl: profilePhotoThumbPath,
        cardPhotoThumbUrl: cardPhotoThumbPath
      }));
    } catch (error) {
      this.presentToast('Erreur lors de la sauvegarde des photos.', 'danger', 'top');
    }
  }

  editClient() {
    const clientId = this.route.snapshot.paramMap.get('id');
    this.router.navigate(['/edit-client', clientId]);
  }

  async deleteClient() {
    const alert = await this.alertController.create({
      header: 'Confirmer la suppression',
      message: 'Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer', handler: () => {
            const clientId = this.route.snapshot.paramMap.get('id');
            if (clientId) this.store.dispatch(ClientActions.deleteClient({ id: clientId }));
          }
        }
      ]
    });
    await alert.present();
  }

  async presentToast(message: string, color: string, position: 'top' | 'bottom' | 'middle') {
    const toast = await this.toastController.create({ message, duration: 2000, color, position });
    toast.present();
  }

  async editBalance() {
    const alert = await this.alertController.create({
      header: 'Modifier le solde',
      inputs: [{ name: 'balance', type: 'number', placeholder: 'Nouveau solde' }],
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Mettre à jour', handler: (data) => {
            const clientId = this.route.snapshot.paramMap.get('id');
            if (clientId) this.store.dispatch(ClientActions.updateClientBalance({ clientId: clientId, balance: data.balance }));
          }
        }
      ]
    });
    await alert.present();
  }

  async updateLocation() {
    const clientId = this.route.snapshot.paramMap.get('id');
    if (!clientId) return;

    const modal = await this.modalController.create({ component: LocationUpdateComponent, componentProps: { clientId } });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data && data.latitude && data.longitude) {
      this.store.dispatch(ClientActions.updateClientLocation({ id: clientId, latitude: data.latitude, longitude: data.longitude }));
    }
  }

  callClient(phoneNumber: string) {
    if (phoneNumber) {
      window.location.href = `tel:${phoneNumber}`;
    }
  }
}
