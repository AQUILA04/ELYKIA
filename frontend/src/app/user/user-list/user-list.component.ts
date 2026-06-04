import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { User, UserService } from '../service/user.service';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AlertService } from 'src/app/shared/service/alert.service';

interface UserListState {
  searchTerm: string;
  currentPage: number;
  pageSize: number;
}

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class UserListComponent implements OnInit, OnDestroy {
  private readonly STATE_KEY = 'userListState';
  private dateIntervalId?: ReturnType<typeof setInterval>;

  users: User[] = [];
  currentPage = 0;
  pageSize = 10;
  totalElement = 0;
  isLoading = true;
  searchTerm = '';

  currentDate = new Date();
  lastUpdate = new Date();

  constructor(
    private userService: UserService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private alertService: AlertService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.restoreState();
    this.loadUsers();
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.saveState();
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUser(this.currentPage, this.pageSize, this.searchTerm).subscribe({
      next: (data) => {
        this.users = data.data?.content ?? [];
        this.totalElement = data.data?.page?.totalElements ?? data.data?.totalElements ?? 0;
        this.lastUpdate = new Date();
        this.isLoading = false;
        this.saveState();
      },
      error: (err) => {
        console.error('Erreur lors du chargement des utilisateurs', err);
        this.alertService.showError('Erreur de communication avec le serveur');
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.saveState();
    this.loadUsers();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 0;
    this.saveState();
    this.loadUsers();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.currentPage = 0;
    this.saveState();
    this.loadUsers();
  }

  refresh(): void {
    this.loadUsers();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.saveState();
    this.loadUsers();
  }

  isUserActive(user: User): boolean {
    return user.state === 'ENABLED' || user.active === true;
  }

  getStatusLabel(user: User): string {
    return this.isUserActive(user) ? 'Actif' : 'Inactif';
  }

  getStatusBadgeClass(user: User): string {
    return this.isUserActive(user) ? 'status-active' : 'status-inactive';
  }

  toggleActive(user: User): void {
    const active = this.isUserActive(user);
    const action = active ? 'désactiver' : 'activer';
    this.alertService.showConfirmation('Confirmation', `Voulez-vous vraiment ${action} cet utilisateur ?`)
      .then((result) => {
        if (!result) {
          return;
        }
        const request = active
          ? this.userService.deactivateUser(user.id)
          : this.userService.activateUser(user.id);
        request.subscribe({
          next: () => {
            this.alertService.showDefaultSucces(`Utilisateur ${active ? 'désactivé' : 'activé'} avec succès.`);
            this.loadUsers();
          },
          error: (err) => {
            this.alertService.showError(err?.error?.message || 'Erreur lors de l\'action.');
          }
        });
      });
  }

  addUser(): void {
    this.saveState();
    this.router.navigate(['/user-add']);
  }

  viewDetails(id: number): void {
    this.saveState();
    this.router.navigate(['/user-details', id]);
  }

  editUser(id: number): void {
    this.saveState();
    this.router.navigate(['/user-add', id]);
  }

  deleteUser(id: number): void {
    this.alertService.showDeleteConfirmation('Voulez-vous vraiment supprimer cet utilisateur ?')
      .then(result => {
        if (result) {
          this.userService.deleteUser(id).subscribe({
            next: () => {
              this.alertService.showDefaultSucces('L\'utilisateur a été supprimé avec succès');
              this.loadUsers();
            },
            error: () => {
              this.alertService.showDefaultError('Erreur lors de la suppression de l\'utilisateur');
            }
          });
        }
      });
  }

  private saveState(): void {
    const state: UserListState = {
      searchTerm: this.searchTerm,
      currentPage: this.currentPage,
      pageSize: this.pageSize
    };
    sessionStorage.setItem(this.STATE_KEY, JSON.stringify(state));
  }

  private restoreState(): void {
    const saved = sessionStorage.getItem(this.STATE_KEY);
    if (!saved) {
      return;
    }
    try {
      const state = JSON.parse(saved) as UserListState;
      this.searchTerm = state.searchTerm ?? '';
      this.currentPage = state.currentPage ?? 0;
      this.pageSize = state.pageSize ?? 10;
    } catch (e) {
      console.error('Erreur restauration état liste utilisateurs', e);
    }
  }
}
