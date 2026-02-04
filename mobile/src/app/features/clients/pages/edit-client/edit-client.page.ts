import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { Locality } from 'src/app/models/locality.model';
import { selectAllLocalities } from 'src/app/store/locality/locality.selectors';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType } from '@capacitor/camera';
import * as ClientActions from 'src/app/store/client/client.actions';
import * as ClientSelectors from 'src/app/store/client/client.selectors';
import { AlertController, NavController, ToastController } from '@ionic/angular';
import { Actions, ofType } from '@ngrx/effects';
import { map, take, filter } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Filesystem, Directory } from '@capacitor/filesystem';
import * as LocalityActions from 'src/app/store/locality/locality.actions';
import { ActivatedRoute } from '@angular/router';
import { Client } from 'src/app/models/client.model';
import { selectAuthUser } from '../../../../store/auth/auth.selectors';
import { LoggerService } from '../../../../core/services/logger.service';
import * as AccountActions from 'src/app/store/account/account.actions';
import { selectAccountByClientId } from 'src/app/store/account/account.selectors';

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
  selector: 'app-edit-client',
  templateUrl: './edit-client.page.html',
  styleUrls: ['./edit-client.page.scss'],
  standalone: false
})
export class EditClientPage implements OnInit, OnDestroy {

  clientForm: FormGroup;
  localities$: Observable<Locality[]>;
  filteredLocalities$: Observable<Locality[]>;
  coordinates: { latitude: number, longitude: number } | null = null;
  manualGeolocation = false;
  isLocalityModalOpen = false;
  private localities: Locality[] = [];
  private searchSubject = new BehaviorSubject<string>('');

  private subscriptions: Subscription[] = [];
  private destroy$ = new Subject<void>();
  private currentUser$ = this.store.select(selectAuthUser);
  previewImage: string | null = null;
  photoToSave: any;
  cardPhotoToSave: any;
  private clientId!: string;
  private initialBalance: number = 0;
  private originalClient: Client | null = null;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private alertController: AlertController,
    private navCtrl: NavController,
    private actions$: Actions,
    private log: LoggerService,
    private route: ActivatedRoute,
    private toastController: ToastController
  ) {
    this.clientForm = this.fb.group({
      id: [''],
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      dateOfBirth: ['', [Validators.required, ageValidator(18)]],
      occupation: ['', Validators.required],
      phone: [
        '',
        [
          Validators.required,
          Validators.pattern(
            '^(90|91|92|93|99|98|97|96|70|71|79|78)[0-9]{6}')
        ]],
      cardType: ['', Validators.required],
      cardID: ['', [Validators.required, Validators.minLength(6), Validators.
        maxLength(26)]],
      address: ['', Validators.required],
      quarter: [''],
      contactPersonName: [''],
      contactPersonPhone: [''],
      contactPersonAddress: [''],
      latitude: [null, Validators.required],
      longitude: [null, Validators.required],
      profilPhoto: [null],
      cardPhoto: [null],
      balance: [{ value: 0, disabled: true }]
    });

    this.localities$ = this.store.select(selectAllLocalities);
    this.localities$.subscribe(localities => {
      this.localities = localities;
    });

    this.filteredLocalities$ = this.searchSubject.asObservable().pipe(
      map(searchTerm =>
        this.localities.filter(locality =>
          locality.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    );
  }

  ngOnInit() {
    this.store.dispatch(LocalityActions.loadLocalities());
    this.store.dispatch(AccountActions.loadAccounts()); // Load accounts

    this.clientId = this.route.snapshot.paramMap.get('id') || '';
    if (this.clientId) {
      this.store.select(ClientSelectors.selectClientById(this.clientId)).pipe(
        filter(client => !!client),
        take(1)
      ).subscribe(client => {
        this.originalClient = client;
        this.clientForm.patchValue(client);
      });

      this.store.select(selectAccountByClientId(this.clientId)).pipe(
        filter(account => !!account),
        take(1)
      ).subscribe(account => {
        this.clientForm.patchValue({ balance: account.accountBalance });
        this.initialBalance = account.accountBalance;
        this.clientForm.get('balance')?.enable();
      });
    }

    this.subscriptions.push(
      this.actions$.pipe(
        ofType(ClientActions.updateClientSuccess),
        take(1)
      ).subscribe(() => {
        this.presentToast('Client modifié avec succès.');
        this.navCtrl.navigateBack('/tabs/clients');
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit() {
    if (this.clientForm.invalid || !this.originalClient) {
      return;
    }

    const formValue = this.clientForm.getRawValue();

    // Merge form values into the original client object to preserve all fields
    const updatedClient: Client = {
      ...this.originalClient,
      ...formValue,
      id: this.clientId,
      fullName: `${formValue.firstname} ${formValue.lastname}`,
      mll: (formValue.latitude && formValue.longitude) ? `https://www.google.com/maps/search/?api=1&query=${formValue.latitude},${formValue.longitude}` : this.originalClient.mll,
      isLocal: true // Ensure isLocal is true for local edits
    };

    // Update balance only if it changed
    if (formValue.balance !== this.initialBalance) {
      this.store.dispatch(ClientActions.updateClientBalance({
        clientId: this.clientId,
        balance: formValue.balance
      }));
    }

    // Update client info
    delete (updatedClient as any).balance; // Remove balance from client update payload
    this.store.dispatch(ClientActions.updateClient({ client: updatedClient }));
  }

  resetForm() {
    this.clientForm.reset();
    this.coordinates = null;
  }

  async getGeolocation() {
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      this.clientForm.patchValue({
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude
      });
      this.coordinates = coordinates.coords;
    } catch (error) {
      console.error('Error getting location', error);
    }
  }

  async takePicture() {
    const image = await Camera.getPhoto({
      quality: 50,
      width: 800,
      height: 800,
      allowEditing: false,
      resultType: CameraResultType.Uri
    });

    if (image.path) {
      const file = await Filesystem.readFile({ path: image.path });
      const newFileName = `Pictures/Elykia/client_photos/${new Date().getTime()}.jpeg`;

      // Create directory if it doesn't exist (optional but good practice)
      try {
        await Filesystem.mkdir({
          path: 'Pictures/Elykia/client_photos',
          directory: Directory.ExternalStorage,
          recursive: true
        });
      } catch (e) {
        // Ignore if exists
      }

      await Filesystem.writeFile({
        path: newFileName,
        data: file.data,
        directory: Directory.ExternalStorage
      });

      this.clientForm.patchValue({ profilPhoto: newFileName });
      this.previewImage = `data:image/jpeg;base64,${file.data}`;
    }
  }

  async takeCardPicture() {
    const image = await Camera.getPhoto({
      quality: 50,
      width: 800,
      height: 800,
      allowEditing: false,
      resultType: CameraResultType.Uri
    });

    if (image.path) {
      const file = await Filesystem.readFile({ path: image.path });
      const newFileName = `Pictures/Elykia/card_photos/card_${new Date().getTime()}.jpeg`;

      // Create directory if it doesn't exist
      try {
        await Filesystem.mkdir({
          path: 'Pictures/Elykia/card_photos',
          directory: Directory.ExternalStorage,
          recursive: true
        });
      } catch (e) {
        // Ignore if exists
      }

      await Filesystem.writeFile({
        path: newFileName,
        data: file.data,
        directory: Directory.ExternalStorage
      });

      this.clientForm.patchValue({ cardPhoto: newFileName });
    }
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000
    });
    toast.present();
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

}
