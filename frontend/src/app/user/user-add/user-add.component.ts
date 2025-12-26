import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService, User } from '../service/user.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';

@Component({
  selector: 'app-user-add',
  templateUrl: './user-add.component.html',
  styleUrls: ['./user-add.component.scss']
})
export class UserAddComponent implements OnInit {
  userForm!: FormGroup;
  isLoading = false;
  userId?: number;
  profiles: any[] = []; // Initialize profiles as an array

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService,
    private tokenStorage : TokenStorageService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.initForm();
    this.loadProfiles(); // Load profiles when component initializes

    // Extract userId from route parameters
    this.route.params.subscribe(params => {
      this.userId = +params['id'];
      if (this.userId) {
        this.loadUser(this.userId);
      }
    });
  }

  initForm(): void {
    this.userForm = this.formBuilder.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      gender: ['', Validators.required],
      password: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
      profilId: ['', Validators.required],
    });
  }

  loadUser(userId: number): void {
    this.userService.getUserById(userId).subscribe(
      res => {
        const user = res.data;
        this.userForm.patchValue({
          username: user.username,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          gender: user.gender,
          phone: user.phone,
          profilId: user.profilId,
        });
      },
      error => {
        console.error('Erreur lors du chargement de l\'utilisateur', error);
        const errorMessage = error?.error?.message || 'Erreur lors du chargement de l\'utilisateur';
        this.alertService.showError(errorMessage);
      }
    );
  }

  loadProfiles(): void {
    this.userService.getProfiles().subscribe(
      response => {
        this.profiles = response.data; 
      },
      error => {
        console.error('Error fetching profiles', error);
      }
    );
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      this.isLoading = true;
      const formData: User = {
        ...this.userForm.value,
      };

      if (this.userId) {
        this.userService.updateUser(this.userId, formData).subscribe(
          () => {
            this.alertService.showSuccess('Utilisateur mis à jour avec succès');
            this.isLoading = false;
            this.router.navigate(['/user-list']);
          },
          error => {
            const errorMessage = error?.error?.message || 'Erreur lors de la mise à jour de l\'utilisateur';
            this.alertService.showError(errorMessage);
            this.isLoading = false;
          }
        );
      } else {
        // Add new user
        this.userService.addUser(formData).subscribe(
          () => {
            this.alertService.showSuccess('Nouvel utilisateur ajouté avec succès');
            this.isLoading = false;
            this.router.navigate(['/user-list']);
          },
          error => {
            const errorMessage = error?.error?.message || 'Erreur lors de l\'ajout du nouvel utilisateur';
            this.alertService.showError(errorMessage);
            this.isLoading = false;
          }
        );
      }
    }
  }

  onCancel(): void {
    this.router.navigate(['/user-list']);
  }
}
