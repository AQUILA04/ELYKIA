import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { OutService } from '../service/out.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';

@Component({
  selector: 'app-out-details',
  templateUrl: './out-details.component.html',
  styleUrls: ['./out-details.component.scss']
})
export class OutDetailsComponent implements OnInit {
  credit: any | undefined;
  isLoading = true;
  creditId: number | null;

  constructor(
    private route: ActivatedRoute,
    private spinner: NgxSpinnerService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private outService: OutService
  ) {
    this.tokenStorage.checkConnectedUser();
    this.creditId = null;
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const creditId = +params['id'];
      this.creditId = creditId;
      this.loadOutDetails(creditId);
    });
  }

  loadOutDetails(creditId: number): void {
    this.spinner.show();
    this.outService.getOutById(creditId).subscribe(
      (data: any) => {
        this.credit = data.data;
        console.log('Statut du crédit:', this.credit.status); 
        this.isLoading = false;
        this.spinner.hide();
      },
      error => {
        console.error('Erreur lors du chargement des détails du crédit', error);
        this.isLoading = false;
        this.spinner.hide();
      }
    );
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIF':
        return 'badge-success';
      case 'CREATED':
        return 'badge-primary';
      case 'VALIDATED':
        return 'badge-info';
      case 'INPROGRESS':
        return 'badge-warning';
      case 'DELIVERED':
        return 'badge-success';
      case 'ENDED':
        return 'badge-dark';
      case 'SETTLED':
        return 'badge-secondary';
      default:
        return 'badge-secondary';
    }
  }

  onCancel(): void {
    this.router.navigate(['/out-list']);
  }
}
