import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import Swal from 'sweetalert2';
import {AuthService} from "../../auth/service/auth.service";

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit  {
  username: string| null = '';

  constructor(private router : Router,
              private tokenStorage : TokenStorageService,
              private authService: AuthService,
              private alertService: AlertService
  ) {

   }
  ngOnInit(): void {

    this.username = this.authService.getUsername();
  }

  confirmLogout(): void {
    this.alertService.showConfirmation('Confirmation de deconnexion', 'Voulez-vous vraiment vous déconnecter?', 'Oui', 'Non')
    .then((result) => {
      if (result) {
        this.logout();
      }
    });
  }

  logout(): void {

    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}
