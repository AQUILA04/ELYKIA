import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../service/user.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss']
})
export class UserDetailsComponent implements OnInit {
  userId?: number;
  user: any;
  isLoading = true;
  profiles: any;
  profileName: string='';

  constructor(
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService,
    private tokenStorage : TokenStorageService,
    private spinner : NgxSpinnerService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.userId = +params['id'];
      if (this.userId) {
        this.loadUserDetails(this.userId);
      }
    });
    this.loadProfiles();
  }
  onCancel(): void {
    this.router.navigate(['/user-list']);
  }
  navigateToEdit(): void {
    this.router.navigate(['/user-add', this.userId]);
  }
  loadUserDetails(userId: number): void {
    this.spinner.show();
    this.userService.getUserById(userId).subscribe(
      res => {
        this.spinner.hide();
        this.user = res.data;
        this.isLoading = false;
      },
      error => {
        this.spinner.hide();
        console.error('Erreur lors du chargement des détails de l\'utilisateur', error);
        const errorMessage = error?.error?.message || 'Erreur lors du chargement des détails de l\'utilisateur';
        this.alertService.showError(errorMessage);
        this.isLoading = false;
      }
    );
  }
  loadProfiles(): void {
    this.spinner.show();
    this.userService.getProfiles().subscribe(
      response => {
        this.spinner.hide();
        this.profiles = response.profil; 
      },
      error => {
        this.spinner.hide();
        console.error('Error fetching profiles', error);
      }
    );
  }
  onBack(): void {
    this.router.navigate(['/user-list']);
  }
}