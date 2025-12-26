import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/service/alert.service';
import { CreditService, CreditFormData  } from '../../service/credit.service';
import { ItemService } from 'src/app/article/service/item.service';
import { ClientService } from 'src/app/client/service/client.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';
import {AuthService} from "../../../auth/service/auth.service";


interface TontineDeliveryPayload {
  clientId: number;
  articles: Array<{
    articleId: number;
    quantity: number;
  }>;
  advance: number;
  beginDate: string;
  expectedEndDate: string | null;
  totalAmount: number;
}


@Component({
  selector: 'app-create-tontine',
  templateUrl: './create-tontine.component.html',
  styleUrls: ['./create-tontine.component.scss']
})
export class CreateTontineComponent implements OnInit, OnDestroy {

  deliveryForm!: FormGroup;
  promoterClients: any[] = [];
  articles: any[] = [];
  isLoading = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private creditService: CreditService,
    private clientService: ClientService,
    private itemService: ItemService,
    private router: Router,
    private alertService: AlertService,
    private tokenStorage: TokenStorageService,
    private spinner: NgxSpinnerService,
    private authService: AuthService
  ) {
    this.tokenStorage.checkConnectedUser();
    this.initForm();
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
  }

  private initForm(): void {
    this.deliveryForm = this.fb.group({
      clientId: ['', Validators.required],
      articles: [[], Validators.required],
      advance: [0], //[Validators.required, Validators.min(0)]
      beginDate: [new Date().toISOString().split('T')[0]],
      expectedEndDate: [null],
      totalAmount: [0]
    });
  }

  private loadInitialData(): void {
    this.spinner.show();
    const currentUser = this.authService.getCurrentUser();

    const loadSub = forkJoin({
      clients: this.clientService.getClients(0, 10000, 'id,desc', currentUser)
        .pipe(map(response => response.data.content)),
      articles: this.itemService.getAllArticles()
        .pipe(map(response => response.data.content))
    }).subscribe({
      next: ({ clients, articles }) => {
        // Filter only PROMOTER clients
        this.promoterClients = clients.filter((client: any) =>
          client.clientType === 'PROMOTER'
        );
        this.articles = articles;
        this.spinner.hide();

        if (this.promoterClients.length === 0) {
          this.alertService.showWarning(
            'Aucun client promoteur trouvé. Veuillez d\'abord créer des clients promoteurs.',
            'Attention'
          );
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données:', error);
        this.alertService.showError('Erreur lors du chargement des données');
        this.spinner.hide();
      }
    });

    this.subscriptions.push(loadSub);
  }

  onSubmit(): void {
    if (this.deliveryForm.invalid) {
      this.markFormGroupTouched(this.deliveryForm);
      this.alertService.showWarning('Veuillez remplir tous les champs requis', 'Formulaire invalide');
      return;
    }

    this.spinner.show();
    this.isLoading = true;

    const formValue = this.deliveryForm.value;

    // Préparer le payload en utilisant l'interface CreditFormData
    const payload: CreditFormData = {
      clientId: formValue.clientId,
      articles: formValue.articles.map((article: any) => ({
        articleId: article.articleId,
        quantity: article.quantity
      })),
      advance: formValue.advance || 0,
      beginDate: formValue.beginDate,
      expectedEndDate: formValue.expectedEndDate,
      totalAmount: formValue.totalAmount
    };

    const submitSub = this.creditService.createTontine(payload).subscribe({
      next: (response) => {
        this.spinner.hide();
        const body = response.body || response;

        if (body.statusCode === 200 || body.statusCode === 201) {
          this.alertService.showSuccess('Livraison tontine créée avec succès');
          this.router.navigate(['/credit-list']);
        } else {
          this.alertService.showError(body.message || 'Une erreur est survenue');
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.spinner.hide();
        console.error('Erreur lors de la création de la livraison tontine:', error);
        this.alertService.showError(
          error.message || 'Erreur lors de la création de la livraison tontine'
        );
        this.isLoading = false;
      }
    });

    this.subscriptions.push(submitSub);
  }

  onTotalAmountChange(totalAmount: number): void {
    this.deliveryForm.patchValue({
      totalAmount: totalAmount
    }, { emitEvent: false });
  }

  onCancel(): void {
    this.router.navigate(['/credit-list']);
  }

  searchClient = (term: string, item: any) => {
    term = term.toLowerCase();
    const fullName = `${item.firstname} ${item.lastname}`.toLowerCase();
    return fullName.includes(term);
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
