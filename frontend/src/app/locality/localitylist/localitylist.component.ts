import { Component, OnInit } from '@angular/core';
import { LocalityService, Locality } from '../service/locality.service';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-localitylist',
  templateUrl: './localitylist.component.html',
  styleUrls: ['./localitylist.component.scss']
})
export class LocalityListComponent implements OnInit {
  localities: Locality[] = [];
  currentPage = 0;
  pageSize = 5;
  totalElement = 0;
  searchTerm: string = '';

  constructor(
    private localityService: LocalityService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private spinner: NgxSpinnerService,
    private alertService: AlertService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.loadLocalities();
  }

  loadLocalities(): void {
    this.spinner.show();
    const search = this.searchTerm.trim();
    const page = this.currentPage;
    const size = this.pageSize;

    // ** NOUVELLE LOGIQUE **
    // On utilise un opérateur ternaire comme dans l'inventaire pour choisir le bon service.
    // Cela suppose que votre service a deux méthodes distinctes ou gère un paramètre de recherche.
    // Ici, nous adaptons la logique en utilisant une seule méthode de service qui accepte le terme de recherche.
    const request$ = this.localityService.getLocalities(page, size, 'id,desc', search);

    request$.subscribe({
      next: (data) => {
        if (data.statusCode === 200) {
          this.localities = data.data.content;
          this.totalElement = data.data.page.totalElements;
        } else {
          this.alertService.showError(data.message || 'Une erreur est survenue');
        }
        this.spinner.hide();
      },
      error: (err) => {
        this.spinner.hide();
        this.alertService.showError('Erreur de communication avec le serveur');
        console.error(err);
      }
    });
  }

  // L'ancienne méthode applyFilter est renommée en onSearch
  onSearch(): void {
    this.currentPage = 0; // On retourne à la première page pour chaque nouvelle recherche
    this.loadLocalities();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadLocalities();
  }

  // La méthode de rafraîchissement vide la recherche et appelle onSearch
  refresh(): void {
    this.searchTerm = '';
    this.onSearch(); // Appel de la nouvelle méthode
  }

  // Les autres méthodes restent inchangées
  deleteLocality(id: number): void {
    this.alertService.showDeleteConfirmation('Êtes-vous sûr de vouloir supprimer cette localité?')
    .then((result) => {
      if (result) {
        this.localityService.deleteLocality(id).subscribe({
          next: () => {
            this.alertService.showDefaultSucces('La localité a été supprimée avec succès!');
            this.loadLocalities(); // Recharger la liste
          },
          error: (error) => {
            const errorMessage = error?.error?.message || 'Erreur lors de la suppression.';
            this.alertService.showError(errorMessage);
            console.error('Erreur lors de la suppression de la localité', error);
          }
        });
      }
    });
  }

  addLocality(): void {
    this.router.navigate(['/locality-add']);
  }

  viewDetails(localityId: number): void {
    this.router.navigate(['/localitydetails', localityId]);
  }

  editLocality(localityId: number): void {
    this.router.navigate(['/locality-add', localityId]);
  }
}
