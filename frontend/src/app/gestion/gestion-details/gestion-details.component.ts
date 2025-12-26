import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Agency, GestionService } from '../service/gestion.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-gestion-details',
  templateUrl: './gestion-details.component.html',
  styleUrls: ['./gestion-details.component.scss']
})
export class GestionDetailsComponent implements OnInit {
  agency: Agency | undefined;
  isLoading = true;
  agencyId?: number;

  constructor(
    private route: ActivatedRoute,
    private gestionService: GestionService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private spinner : NgxSpinnerService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const agencyId = +params['id'];  
      if (agencyId) {
        this.loadAgency(agencyId);
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/gestion-list']);  
  }

  navigateToEdit(agencyId: number): void {
    this.router.navigate(['/gestion-add', agencyId]);  
  }

  loadAgency(agencyId: number): void {
    this.spinner.show();
    this.gestionService.getGestionById(agencyId).subscribe(
      (response: { data: Agency }) => {
        this.spinner.hide();
        this.agency = response.data;  
        this.isLoading = false;
      },
      error => {
        this.spinner.hide();
        console.error('Erreur lors du chargement de l\'agence', error);
        this.isLoading = false;
      }
    );
  }
}