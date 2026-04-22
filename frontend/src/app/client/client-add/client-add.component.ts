import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientService, Client } from '../service/client.service';
import { LocalityService, Locality } from 'src/app/locality/service/locality.service';
import { AccountService } from 'src/app/account/service/account.service';
import Swal from 'sweetalert2';
import { AlertService } from 'src/app/shared/service/alert.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ParameterService } from 'src/app/parameters/parameter.service';
import { AuthService } from 'src/app/auth/service/auth.service';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';

@Component({
  selector: 'app-client-add',
  templateUrl: './client-add.component.html',
  styleUrls: ['./client-add.component.scss']
})
export class ClientAddComponent implements OnInit {
  clientForm!: FormGroup;
  localities: Locality[] = [];
  isLoading = false;
  agents: any[] = [];
  today: string | number | Date | undefined = new Date();
  clientId?: number;

  idDocBase64: string | null = null;
  profilePhotoBase64: string | null = null;
  fileError = false;

  coordinates: { latitude: number, longitude: number } | null = null;

  // AJOUT : Pour gérer le mode de saisie de la géolocalisation
  manualGeolocation = false;

  // AJOUT : Variables pour le compte
  accountNumber: string = '';
  isAccountSectionVisible: boolean = false;

  isPromoter = false;
  currentUser: any;

  constructor(
    private formBuilder: FormBuilder,
    private clientService: ClientService,
    private localityService: LocalityService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService,
    private spinner: NgxSpinnerService,
    private tokenStorage: TokenStorageService,
    private accountService: AccountService,
    private parameterService: ParameterService,
    private authService: AuthService,
    private userService: UserService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);

    this.initForm();
    this.loadLocalities();
    this.loadAgents();
    this.loadAgencyCollector();

    this.route.params.subscribe(params => {
      this.clientId = +params['id'];
      if (this.clientId) {
        this.loadClient(this.clientId);
      } else {
        // Mode Ajout : Initialiser le formulaire de compte
        this.isAccountSectionVisible = true;
        this.initAccountForm();

        if (this.isPromoter) {
          this.clientForm.patchValue({
            collector: this.currentUser.username,
            tontineCollector: this.currentUser.username
          });
          this.clientForm.get('collector')?.disable();
          this.clientForm.get('tontineCollector')?.disable();
        }
      }
    });
  }

  initForm(): void {
    this.clientForm = this.formBuilder.group({
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      address: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
      cardID: ['', Validators.required],
      cardType: ['', Validators.required],
      dateOfBirth: ['', [Validators.required, this.minAgeValidator(16)]],
      contactPersonName: [''],
      contactPersonPhone: ['', Validators.pattern('^[0-9]{8}$')],
      contactPersonAddress: [''],
      occupation: ['', Validators.required],
      quarter: ['', Validators.required],
      collector: ['', Validators.required],
      tontineCollector: ['', Validators.required],
      agencyCollector: [{value: '', disabled: true}, Validators.required],
      clientType: ['', Validators.required],
      latitude: [null],
      longitude: [null]
    });
  }

  initAccountForm(): void {
    // Ajout des contrôles pour le compte
    this.clientForm.addControl('accountNumber', this.formBuilder.control({ value: '', disabled: true }));
    this.clientForm.addControl('accountBalance', this.formBuilder.control('0', []));

    // Génération du numéro de compte
    this.generateAccountNumber();
  }

  generateAccountNumber(): void {
    this.spinner.show();
    this.accountService.getTotalAccount().subscribe(
      (totalAccounts) => {
        this.spinner.hide();
        const nextAccountNumber = (totalAccounts + 1).toString().padStart(4, '0');
        // Préfixe exemple basé sur l'existant : 002102
        this.accountNumber = `002102${nextAccountNumber}`;
        this.clientForm.patchValue({ accountNumber: this.accountNumber });
      },
      (error) => {
        this.spinner.hide();
        console.error('Erreur lors de la récupération du nombre de comptes', error);
        this.alertService.showError('Impossible de générer le numéro de compte.');
      }
    );
  }

  loadAgents(): void {
    this.clientService.getAgents().subscribe(
      data => {
        this.spinner.show();
        this.agents = data;
        this.spinner.hide();
      },
      error => {
        console.error('Erreur lors du chargement des agents', error);
        this.alertService.showError('Erreur lors du chargement des agents');
      }
    );
  }

  loadAgencyCollector(): void {
    this.parameterService.getByKey('AGENCY_COLLECTOR').subscribe({
      next: (param) => {
        if (param && param.value) {
          this.clientForm.patchValue({ agencyCollector: param.value });
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement du paramètre AGENCY_COLLECTOR', err);
      }
    });
  }

  loadLocalities(): void {
    this.localityService.getLocalities(0, 10000, 'id,desc').subscribe(
      data => {
        this.localities = data.data.content;
      },
      error => {
        console.error('Erreur lors du chargement des localités', error);
        this.alertService.showError('Erreur lors du chargement des localités');
      }
    );
  }

  loadClient(clientId: number): void {
    this.clientService.getClient(clientId).subscribe(
      res => {
        const client = res.data;
        this.clientForm.patchValue({
          firstname: client.firstname,
          lastname: client.lastname,
          address: client.address,
          phone: client.phone,
          cardID: client.cardID,
          cardType: client.cardType,
          contactPersonName: client.contactPersonName,
          occupation: client.occupation,
          contactPersonPhone: client.contactPersonPhone,
          contactPersonAddress: client.contactPersonAddress,
          collector: client.collector || '',
          tontineCollector: client.tontineCollector || '',
          agencyCollector: client.agencyCollector || '',
          quarter: client.quarter,
          clientType: client.clientType,
          dateOfBirth: client.dateOfBirth ? new Date(client.dateOfBirth).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
          latitude: client.latitude,
          longitude: client.longitude
        });
        this.profilePhotoBase64 = client.profilPhoto || null;
        this.idDocBase64 = client.iddoc || null;

        if (this.isPromoter) {
          this.clientForm.get('collector')?.disable();
          this.clientForm.get('tontineCollector')?.disable();
        }
      },
      error => {
        console.error('Erreur lors du chargement du client', error);
        this.alertService.showError('Erreur lors du chargement du client');
      }
    );
  }

  searchLocality = (term: string, item: Locality) => {
    return item.name.toLowerCase().includes(term.toLowerCase());
  }

  searchAgent = (term: string, item: any) => {
    return item.username.toLowerCase().includes(term.toLowerCase());
  }

  onSubmit(): void {
    if (this.clientForm.valid && !this.fileError) {
      this.spinner.show();
      this.isLoading = true;
      const formData: any = {
        ...this.clientForm.getRawValue(), // Use getRawValue to include disabled fields
        iddoc: this.idDocBase64 || null,
        profilPhoto: this.profilePhotoBase64 || null,
      };

      if (this.clientId) {
        // ... (votre code de mise à jour existant, pas de changement nécessaire ici)
        this.clientService.updateClient(this.clientId, formData).subscribe(
          (resp) => {
            if (resp.statusCode == 200) {
              this.spinner.hide();
              this.alertService.showSuccess('Client mis à jour avec succès');
              this.isLoading = false;
              this.router.navigate(['/client-list']);
            } else {
              this.spinner.hide();
              this.alertService.showError('Erreur lors de la mise à jour du client : ' + resp.message);
              this.isLoading = false;
            }

          },
          error => {
            this.spinner.hide();
            this.alertService.showError('Erreur lors de la mise à jour du client : ' + error.message);
            this.isLoading = false;
          }
        );
      } else {
        console.log('Adding client with Account creation flow');
        // Ajout Client + Compte
        this.clientService.addClient(formData).subscribe(
          (resp: any) => {
            if (resp.statusCode == 200) {
              const createdClientId = resp.data.id;

              // Création du compte associé
              const accountData = {
                accountNumber: this.accountNumber,
                clientId: createdClientId,
                accountBalance: this.clientForm.get('accountBalance')?.value
              };

              this.accountService.addAccount(accountData).subscribe(
                (accountResp) => {
                  this.spinner.hide();
                  this.alertService.showSuccess('Client et Compte créés avec succès');
                  this.isLoading = false;
                  this.router.navigate(['/client-list']);
                },
                (accountError) => {
                  this.spinner.hide();
                  this.alertService.showError('Client créé mais erreur lors de la création du compte : ' + (accountError?.error?.message || accountError.message));
                  this.isLoading = false;
                  this.router.navigate(['/client-list']);
                }
              );

            } else {
              this.spinner.hide();
              const errorMessage = resp?.message || 'Erreur lors de l\'ajout du nouveau client';
              this.alertService.showError(errorMessage);
              this.isLoading = false;
            }

          },
          error => {
            this.spinner.hide();
            const errorMessage = error?.error?.message || 'Erreur lors de l\'ajout du nouveau client';
            this.alertService.showError(errorMessage);
            this.isLoading = false;
          }
        );
      }
    }
  }

  onIdDocSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      const allowedExtensions = ['pdf', 'jpeg', 'jpg', 'png'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!allowedExtensions.includes(fileExtension!)) {
        this.alertService.showError("Seuls les formats PDF, JPEG et PNG sont autorisés.");
        event.target.value = '';
        return;
      }
      this.convertFileToBase64(file, 'idDoc');
    }
  }

  onProfilePhotoSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      const allowedExtensions = ['jpeg', 'jpg', 'png'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!allowedExtensions.includes(fileExtension!)) {
        this.alertService.showError("Seuls les formats JPEG et PNG sont autorisés pour la photo de profil.");
        event.target.value = '';
        return;
      }
      this.convertFileToBase64(file, 'profilePhoto');
    }
  }

  convertFileToBase64(file: File, type: 'idDoc' | 'profilePhoto'): void {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (type === 'idDoc') {
        this.idDocBase64 = reader.result?.toString() || null;
      } else {
        this.profilePhotoBase64 = reader.result?.toString() || null;
      }
    };
    reader.onerror = error => {
      console.error('Erreur lors de la lecture du fichier', error);
      this.fileError = true;
      this.alertService.showError('Erreur lors de la lecture du fichier');
    };
  }

  getGeolocation(): void {
    if (navigator.geolocation) {
      this.spinner.show();
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.spinner.hide();
          this.coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          this.clientForm.patchValue({
            latitude: this.coordinates.latitude,
            longitude: this.coordinates.longitude
          });
          this.alertService.showSuccess('Position GPS obtenue avec succès !');
        },
        (error) => {
          this.spinner.hide();
          console.error('Erreur de géolocalisation:', error);
          this.alertService.showError(`Erreur de géolocalisation : ${error.message}`);
        }
      );
    } else {
      this.alertService.showError('La géolocalisation n\'est pas supportée par ce navigateur.');
    }
  }

  onCancel(): void {
    this.router.navigate(['/client-list']);
  }

  minAgeValidator(age: number) {
    return (control: any) => {
      const birthDate = new Date(control.value);
      const ageDiff = new Date().getFullYear() - birthDate.getFullYear();
      const isValid = ageDiff >= age;
      return isValid ? null : { minAge: true };
    };
  }
}
