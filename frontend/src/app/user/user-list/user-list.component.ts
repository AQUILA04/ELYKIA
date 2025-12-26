import { Component, OnInit } from '@angular/core';
import { UserService } from '../service/user.service';
import { Router } from '@angular/router';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AlertService } from 'src/app/shared/service/alert.service';



@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
  users: any[] = [];
  isLoading = true;
  pagedUser: any[] = [];
  pageSize: number = 5;
  currentPage: number = 0;
  totalElement = 0;

  constructor(
    private userService: UserService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private tokenStorage : TokenStorageService,
    private alertService: AlertService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.spinner.show();
    this.loadUsers();
    this.spinner.hide();
    this.updatePagedUser();

  }

  loadUsers(): void {
    this.spinner.show();
    this.userService.getUser(this.currentPage, this.pageSize).subscribe(
      data => {
        this.users = data.data.content;
        this.totalElement = data.data.page.totalElements;
        this.spinner.hide();
        this.isLoading = false;
      },
      error => {
        console.error('Erreur lors du chargement des utilisateurs', error);
        this.spinner.hide();
        this.isLoading = false;
      }
    );  
  }
  updatePagedUser(): void {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.pagedUser = this.users.slice(start, end);
  }
  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadUsers();
  }
  

  refresh(): void {
    this.spinner.show();
    this.loadUsers();
    this.spinner.hide();
    
  }
  
  addUser(): void {
    this.router.navigate(['/user-add']);
  }

  viewDetails(id: number): void {
    console.log('view details dans user-list',id)
    this.router.navigate(['/user-details', id]);
    
  }

  editUser(id:number): void {
    this.router.navigate(['/user-add', id]);
  }

  deleteUser(id: number): void {
    this.alertService.showDeleteConfirmation('Voullez-vous vraiment supprimer ce utilisateur ?')
    .then(result => {
      if (result) {
        this.userService.deleteUser(id).subscribe(
          () => {
            this.alertService.showDefaultSucces('L\'utilisateur a été supprimé avec succès');
            this.loadUsers();
          },
          error => {
            this.alertService.showDefaultError('Erreur lors de la suppression du l utilisateur');
          }
        );
      }
    });
  }
  
}

