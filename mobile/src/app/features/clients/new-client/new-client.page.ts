import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable, Subscription, combineLatest, Subject } from 'rxjs';
import { Locality } from 'src/app/models/locality.model';
import { selectAllLocalities, selectLocalityHasMore, selectLocalitiesLoading } from 'src/app/store/locality/locality.selectors';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType } from '@capacitor/camera';
import * as ClientActions from 'src/app/store/client/client.actions';
import * as ClientSelectors from 'src/app/store/client/client.selectors';
import { AlertController, NavController, IonInfiniteScroll } from '@ionic/angular';
import { Actions, ofType } from '@ngrx/effects';
import { map, take, takeUntil, startWith, distinctUntilChanged, debounceTime, filter, tap } from 'rxjs/operators';
import { selectAuthUser } from '../../../store/auth/auth.selectors';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import * as LocalityActions from 'src/app/store/locality/locality.actions';
import { LoggerService } from '../../../core/services/logger.service';
import { FaceDetection, PerformanceMode, LandmarkMode, ContourMode } from '@capacitor-mlkit/face-detection';
import { ThumbnailService } from '../../../core/services/thumbnail.service';

export function ageValidator(minAge: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    const birthDate = new Date(control.value);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= minAge ? null : { 'minAge': true };
  };
}

@Component({
  selector: 'app-new-client',
  templateUrl: './new-client.page.html',
  styleUrls: ['./new-client.page.scss'],
  standalone: false
})
export class NewClientPage implements OnInit, OnDestroy {


  clientForm: FormGroup;
  localities$!: Observable<Locality[]>;
  loadingLocalities$!: Observable<boolean>;
  hasMoreLocalities$!: Observable<boolean>;
  coordinates: { latitude: number, longitude: number } | null = null;
  manualGeolocation = false;
  isLocalityModalOpen = false;

  loading$: Observable<boolean>;
  error$: Observable<any>;

  private searchSubject = new BehaviorSubject<string>('');
  private destroy$ = new Subject<void>();
  private currentUser$ = this.store.select(selectAuthUser);
  photoToSave: any;
  cardPhotoToSave: any;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private alertController: AlertController,
    private navCtrl: NavController,
    private actions$: Actions,
    private log: LoggerService,
    private thumbnailService: ThumbnailService
  ) {
    this.clientForm = this.fb.group({
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      dateOfBirth: ['', [Validators.required, ageValidator(18)]],
      occupation: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern('^(90|91|92|93|99|98|97|96|70|71|72|79|78)[0-9]{6}')]],
      cardType: ['', Validators.required],
      cardID: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(26)]],
      address: ['', Validators.required],
      quarter: ['', Validators.required],
      contactPersonName: [''],
      contactPersonPhone: [''],
      contactPersonAddress: [''],
      latitude: [null, Validators.required],
      longitude: [null, Validators.required],
      profilPhoto: [null, Validators.required],
      cardPhoto: [null],
      balance: [0]
    });

    this.loading$ = this.store.select(ClientSelectors.selectClientsLoading);
    this.error$ = this.store.select(ClientSelectors.selectClientsError);
  }


  ngOnInit() {
    this.localities$ = this.store.select(selectAllLocalities);
    this.loadingLocalities$ = this.store.select(selectLocalitiesLoading);
    this.hasMoreLocalities$ = this.store.select(selectLocalityHasMore);

    // Initial load
    this.loadLocalities();

    // Search subscription
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.loadLocalities(searchTerm);
    });

    this.setupInputSubscriptions();
    this.setupActionSubscriptions();
  }

  loadLocalities(searchTerm: string = '') {
    const filters = searchTerm ? { searchQuery: searchTerm } : undefined;
    this.store.dispatch(LocalityActions.loadFirstPage({ pageSize: 20, filters }));
  }

  loadMoreLocalities(event: any) {
    this.store.dispatch(LocalityActions.loadNextPage({ filters: { searchQuery: this.searchSubject.value } }));

    this.loadingLocalities$.pipe(
      filter(loading => !loading),
      take(1)
    ).subscribe(() => {
      if (event && event.target) {
        (event.target as IonInfiniteScroll).complete();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupInputSubscriptions() {
    this.subscribeToInputChanges('firstname');
    this.subscribeToInputChanges('lastname');
    this.subscribeToInputChanges('occupation');
    this.subscribeToInputChanges('contactPersonName');
  }

  private setupActionSubscriptions() {
    this.error$.pipe(takeUntil(this.destroy$)).subscribe(error => {
      if (error) {
        this.presentAlert('Erreur', error);
      }
    });

    this.actions$.pipe(
      ofType(ClientActions.addClientSuccess),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.presentAlert('Succès', 'Client enregistré avec succès !');
      this.navCtrl.navigateBack('/tabs/clients');
    });
  }

  subscribeToInputChanges(controlName: string) {
    const control = this.clientForm.get(controlName);
    if (control) {
      control.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value: string) => {
        if (value) {
          control.setValue(value.toUpperCase(), { emitEvent: false });
        }
      });
    }
  }

  async onSubmit() {
    if (this.clientForm.invalid) {
      Object.values(this.clientForm.controls).forEach(control => {
        control.markAsTouched();
      });
      return;
    }
    const phone = this.clientForm.get('phone')?.value;
    const contactPersonPhone = this.clientForm.get('contactPersonPhone')?.value;


    if (phone && contactPersonPhone && phone === contactPersonPhone) {
      this.presentAlert('Donnée Invalide', 'Le numéro de téléphone de la personne à contacter ne peut pas être identique au numéro de téléphone principal.');
      return;
    }
    this.store.select(ClientSelectors.selectClientByPhone(phone)).pipe(
      take(1)
    ).subscribe(async (existingClient: any) => {
      if (existingClient) {
        this.presentAlert('Donnée Invalide', phone + ' est déjà utilisé !');
        return;
      }
      let profilPhotoPath = null;
      let profilPhotoThumbPath = null;
      if (this.photoToSave && this.photoToSave.dataUrl) {
        const profilPhotoName = `profile_${Date.now()}.png`;
        profilPhotoPath = `Pictures/Elykia/client_photos/${profilPhotoName}`;
        this.log.log('[ClientPage]: build profilPhotoPath: ' + profilPhotoPath);

        try {
          await Filesystem.mkdir({
            path: 'Pictures/Elykia/client_photos',
            directory: Directory.ExternalStorage,
            recursive: true
          });
        } catch (e) {
          console.error('Unable to create directory client_photos', e);
          this.log.log('[ClientPage]: Unable to create directory client_photos' + e);
        }

        const base64Data = this.getBase64FromDataUrl(this.photoToSave.dataUrl);
        await Filesystem.writeFile({
          path: profilPhotoPath,
          data: base64Data,
          directory: Directory.ExternalStorage
        });

        // Generate thumbnail for profile photo
        profilPhotoThumbPath = await this.thumbnailService.generateThumbnail(profilPhotoPath, 200, 200);
      }

      let cardPhotoPath = null;
      let cardPhotoThumbPath = null;
      if (this.cardPhotoToSave && this.cardPhotoToSave.dataUrl) {
        const cardPhotoName = `card_${Date.now()}.png`;
        cardPhotoPath = `Pictures/Elykia/card_photos/${cardPhotoName}`;

        try {
          await Filesystem.mkdir({
            path: 'Pictures/Elykia/card_photos',
            directory: Directory.ExternalStorage,
            recursive: true
          });
        } catch (e) {
          console.error('Unable to create directory card_photos', e);
          this.log.log('[ClientPage]: Unable to create directory card_photos' + e);
        }

        const cardBase64Data = this.getBase64FromDataUrl(this.cardPhotoToSave.dataUrl);
        await Filesystem.writeFile({
          path: cardPhotoPath,
          data: cardBase64Data,
          directory: Directory.ExternalStorage
        });

        // Generate thumbnail for card photo
        cardPhotoThumbPath = await this.thumbnailService.generateThumbnail(cardPhotoPath, 200, 200);
      }

      this.currentUser$.pipe(
        take(1)
      ).subscribe(user => {
        this.log.log('[ClientPage]: Suscribing to currentUser$');
        if (user && user.username) {
          const clientData = JSON.parse(JSON.stringify(this.clientForm.value));
          delete clientData.profilPhoto;
          delete clientData.cardPhoto;

          // Store only file paths, not base64 data
          clientData.profilPhoto = profilPhotoPath;
          clientData.cardPhoto = cardPhotoPath;

          // Store thumbnail paths for display purposes
          clientData.profilPhotoUrl = profilPhotoPath; // Use thumbnail if available, otherwise original
          clientData.cardPhotoUrl = cardPhotoPath; // Use thumbnail if available, otherwise original
          clientData.profilPhotoThumbUrl = profilPhotoThumbPath;
          clientData.cardPhotoThumbUrl = cardPhotoThumbPath;
          clientData.updatedPhotoUrl = false; // Nouveau client, pas de mise à jour d'URL nécessaire
          clientData.isLocal = true;
          clientData.isSync = false;
          clientData.fullName = `${clientData.firstname} ${clientData.lastname}`;

          // Generate mll link
          if (clientData.latitude && clientData.longitude) {
            clientData.mll = `https://www.google.com/maps/search/?api=1&query=${clientData.latitude},${clientData.longitude}`;
          }

          this.store.dispatch(ClientActions.addClient({
            client: clientData,
            commercialUsername: user.username
          }));
        } else {
          console.error("Impossible de récupérer le nom d'utilisateur du commercial.");
        }
      });
    });
  }

  resetForm() {
    this.clientForm.reset();
    this.coordinates = null;
  }

  async getGeolocation() {
    try {
      // Check permissions
      let permissions = await Geolocation.checkPermissions();

      // If permissions are not granted, request them
      if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
        permissions = await Geolocation.requestPermissions();
      }

      // If permissions are still not granted, show an alert and stop
      if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
        await this.presentAlert('Permission refusée', "L'accès à la géolocalisation est nécessaire pour obtenir les coordonnées.");
        return;
      }

      // Get current position
      const coordinates = await Geolocation.getCurrentPosition();
      this.clientForm.patchValue({
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude
      });
      this.coordinates = coordinates.coords;
    } catch (error) {
      await this.presentAlert('Erreur de géolocalisation', "Impossible d'obtenir les coordonnées. Veuillez vérifier que le GPS est activé.");
    }
  }

  async takePicture() {
    try {
      if (Capacitor.getPlatform() !== 'web') {
        let permissions = await Camera.checkPermissions();
        if (permissions.camera !== 'granted') {
          permissions = await Camera.requestPermissions();
        }

        if (permissions.camera !== 'granted') {
          await this.presentAlert('Permission refusée', "L'accès à la caméra est nécessaire pour prendre une photo.");
          return;
        }
      }

      const image = await Camera.getPhoto({
        quality: 50,
        width: 600,
        height: 600,
        allowEditing: true,
        resultType: Capacitor.getPlatform() === 'web' ? CameraResultType.DataUrl : CameraResultType.Uri
      });

      if (Capacitor.getPlatform() !== 'web' && image.path) {
        const hasFace = await this.validateFaceInImage(image.path);
        if (!hasFace) {
          await this.presentAlert('Visage non détecté', 'La photo doit contenir un visage. Veuillez reprendre la photo.');
          return;
        }

        // Read the file to get the base64 data to maintain compatibility with existing logic
        const fileData = await Filesystem.readFile({
          path: image.path,
        });

        const dataUrl = `data:image/${image.format};base64,${fileData.data}`;

        // Populate the image object with dataUrl so it's handled like on the web
        image.dataUrl = dataUrl;
      }

      this.photoToSave = image;
      // Don't set the base64 data in the form, just a placeholder to pass validation
      this.clientForm.patchValue({ profilPhoto: 'PHOTO_CAPTURED' });
    } catch (error) {
      console.error('Error taking picture', error);
      // Don't show alert if user cancelled or if it's just a "User cancelled photos app" error which is common
      if (typeof error === 'string' && error.includes('User cancelled')) {
        return;
      }
      // On web, if the user closes the file picker without selecting, it might throw "User cancelled photos app" or similar.
      // We can genericize the error message or just log it.
      await this.presentAlert('Erreur Caméra', 'Impossible de prendre une photo.');
    }
  }

  private async validateFaceInImage(imagePath: string): Promise<boolean> {
    try {
      const result = await FaceDetection.processImage({
        path: imagePath,
        performanceMode: PerformanceMode.Fast,
        landmarkMode: LandmarkMode.None,
        contourMode: ContourMode.All,
      });

      if (result.faces.length === 0) {
        this.log.log('[NewClientPage]: No face detected in image.');
        console.warn('Aucun visage détecté.');
        return false;
      }

      return true;
    } catch (error) {
      this.log.log('[NewClientPage]: Error during face detection: ' + error);
      console.error('Erreur lors de la détection de visage:', error);
      return false;
    }
  }

  async takeCardPicture() {
    try {
      if (Capacitor.getPlatform() !== 'web') {
        let permissions = await Camera.checkPermissions();
        if (permissions.camera !== 'granted') {
          permissions = await Camera.requestPermissions();
        }

        if (permissions.camera !== 'granted') {
          await this.presentAlert('Permission refusée', "L'accès à la caméra est nécessaire pour prendre une photo.");
          return;
        }
      }

      const image = await Camera.getPhoto({
        quality: 50,
        width: 800,
        height: 800,
        allowEditing: true,
        resultType: CameraResultType.DataUrl
      });
      this.cardPhotoToSave = image;
      // Don't set the base64 data in the form, just a placeholder to pass validation
      this.clientForm.patchValue({ cardPhoto: 'CARD_PHOTO_CAPTURED' });
    } catch (error) {
      console.error('Error taking card picture', error);
      if (typeof error === 'string' && error.includes('User cancelled')) {
        return;
      }
      await this.presentAlert('Erreur Caméra', 'Impossible de prendre une photo.');
    }
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  openLocalityModal() {
    this.isLocalityModalOpen = true;
  }

  closeLocalityModal() {
    this.isLocalityModalOpen = false;
  }

  onSearch(event: any) {
    this.searchSubject.next(event.target.value);
  }

  selectLocality(locality: Locality) {
    this.clientForm.get('quarter')?.setValue(locality.name);
    this.closeLocalityModal();
  }

  private getBase64FromDataUrl(dataUrl: string): string {
    const parts = dataUrl.split(',');
    if (parts.length > 1) {
      return parts[1];
    }
    return dataUrl; // Fallback in case there is no comma
  }

}
