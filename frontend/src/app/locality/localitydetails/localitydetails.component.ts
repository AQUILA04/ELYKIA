import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalityService,Locality } from '../service/locality.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';


@Component({
  selector: 'app-localitydetails',
  templateUrl: './localitydetails.component.html',
  styleUrls: ['./localitydetails.component.scss']
})
export class LocalityDetailsComponent implements OnInit {
  locality: Locality | undefined;
  isLoading = true;
  localityId?: number;

  constructor(
    private route: ActivatedRoute,
    private localityService: LocalityService,
    private router : Router,
    private tokenStorage : TokenStorageService,
    private spinner : NgxSpinnerService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const localityId = +params['id'];
      if (localityId) {
        this.loadLocality(localityId);
      }
    });
  }
  onCancel(): void {
    this.router.navigate(['/localitylist']);
  }
  navigateToEdit(localityId: number): void {
    this.router.navigate(['/locality-add', localityId]);
  }

  loadLocality(localityId: number): void {
    this.spinner.show();
    this.localityService.getLocalityById(localityId).subscribe(
      (data: any) => {
        this.spinner.hide();
        this.locality = data.data; 
        this.isLoading = false;
      },
      error => {
        this.spinner.hide();
        console.error('Erreur lors du chargement de la localité', error);
        this.isLoading = false;
      }
    );
  }
}
