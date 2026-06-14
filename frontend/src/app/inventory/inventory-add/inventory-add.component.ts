import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryService, ApiResponse } from '../service/inventory.service';
import { Router } from '@angular/router';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-inventory-add',
  templateUrl: './inventory-add.component.html',
  styleUrls: ['./inventory-add.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class AddInventoryComponent implements OnInit, OnDestroy {
  private dateIntervalId?: ReturnType<typeof setInterval>;
  private subscriptions: Subscription[] = [];

  inventoryForm: FormGroup;
  articles: unknown[] = [];
  isLoadingArticles = false;
  isSubmitting = false;
  currentDate = new Date();

  constructor(
    private formBuilder: FormBuilder,
    private inventoryService: InventoryService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private alertService: AlertService
  ) {
    this.tokenStorage.checkConnectedUser();
    this.inventoryForm = this.formBuilder.group({
      articles: [[], Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadArticles();
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
  }

  loadArticles(): void {
    this.isLoadingArticles = true;
    const loadSub = this.inventoryService.getEnabledArticles(0, 10000).subscribe({
      next: (response: ApiResponse) => {
        if (response.statusCode === 200) {
          this.articles = response.data.content;
        } else {
          this.alertService.toastError(response?.message ?? 'Réponse inattendue du serveur.');
        }
        this.isLoadingArticles = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des articles:', error);
        this.alertService.showError('Erreur lors du chargement des articles.');
        this.isLoadingArticles = false;
      }
    });

    this.subscriptions.push(loadSub);
  }

  onSubmit(): void {
    if (this.inventoryForm.invalid) {
      this.markFormGroupTouched(this.inventoryForm);
      this.alertService.showWarning('Veuillez sélectionner au moins un article', 'Formulaire invalide');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.inventoryForm.value;

    const payload = {
      articleEntries: formValue.articles.map((entry: { articleId: number; quantity: number }) => ({
        articleId: entry.articleId,
        quantity: entry.quantity
      }))
    };

    const submitSub = this.inventoryService.addInventories(payload).subscribe({
      next: (response) => {
        if (response.statusCode === 200) {
          this.alertService.showSuccess('Entrée de stock effectuée avec succès');
          this.router.navigate(['/inventory']);
        } else {
          this.alertService.showError(response.message || 'Erreur lors de l\'ajout de l\'article');
          this.isSubmitting = false;
        }
      },
      error: (err) => {
        console.error('Erreur lors de la soumission:', err);
        this.alertService.showError('Erreur lors de la soumission de l\'entrée de stock');
        this.isSubmitting = false;
      }
    });

    this.subscriptions.push(submitSub);
  }

  onCancel(): void {
    this.router.navigate(['/inventory']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
