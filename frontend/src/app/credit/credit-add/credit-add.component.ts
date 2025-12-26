import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertService } from 'src/app/shared/service/alert.service';
import { CreditService } from '../service/credit.service';
import { ItemService } from 'src/app/article/service/item.service';
import { ClientService } from 'src/app/client/service/client.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { forkJoin, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import {AuthService} from "../../auth/service/auth.service";

@Component({
  selector: 'app-credit-add',
  templateUrl: './credit-add.component.html',
  styleUrls: ['./credit-add.component.scss']
})
export class CreditAddComponent implements OnInit, OnDestroy {
  creditForm!: FormGroup;
  clients: any[] = [];
  articles: any[] = [];
  isLoading = false;
  creditId?: number;

  private subscriptions: Subscription[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private creditService: CreditService,
    private clientService: ClientService,
    private itemService: ItemService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService,
    private tokenStorage: TokenStorageService,
    private spinner: NgxSpinnerService,
    private authService: AuthService
  ) {
    this.tokenStorage.checkConnectedUser();
    this.creditForm = this.formBuilder.group({
      clientId: ['', Validators.required],
      articles: [[], Validators.required],
      advance: [0, [Validators.required, Validators.min(0)]],
      beginDate: [new Date().toISOString().split('T')[0]],
      expectedEndDate: [null],
      totalAmount: [0],
    });
  }

  ngOnInit(): void {
    this.spinner.show();
    this.creditId = this.route.snapshot.params['id'] ? +this.route.snapshot.params['id'] : undefined;
    const currentUser = this.authService.getCurrentUser();

    const loadSub = forkJoin({
      clients: this.clientService.getClients(0, 10000, 'id,desc', currentUser.username)
        .pipe(map(response => response.data.content)),
      articles: this.itemService.getAllArticles()
        .pipe(map(response => response.data.content))
    }).subscribe({
      next: ({ clients, articles }) => {
        this.clients = clients;
        this.articles = articles;

        if (this.creditId) {
          this.loadCredit(this.creditId);
        }
        this.spinner.hide();
      },
      error: (error) => {
        this.alertService.showError('Erreur de chargement des données');
        this.spinner.hide();
      }
    });

    this.subscriptions.push(loadSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
  }

  loadCredit(creditId: number): void {
    const loadCreditSub = this.creditService.getCreditById(creditId).subscribe({
      next: (response: any) => {
        const data = response.data;
        if (data) {
          this.creditForm.patchValue({
            clientId: data.client.id,
            advance: data.advance || 0
          });

          // Prepare articles for the article selector component
          const articlesData = (data.articles || []).map((article: any) => ({
            articleId: article.articles.id,
            quantity: article.quantity || 0
          }));

          this.creditForm.patchValue({
            articles: articlesData
          });
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement du crédit:', error);
        this.alertService.showError('Erreur lors du chargement du crédit');
      }
    });

    this.subscriptions.push(loadCreditSub);
  }

  onSubmit(): void {
    if (this.creditForm.invalid) {
      this.markFormGroupTouched(this.creditForm);
      this.alertService.showWarning('Veuillez remplir tous les champs requis', 'Formulaire invalide');
      return;
    }

    this.spinner.show();
    this.isLoading = true;
    const formValue = this.creditForm.value;

    const payload = {
      clientId: formValue.clientId,
      articles: formValue.articles.map((article: any) => ({
        articleId: article.articleId,
        quantity: article.quantity
      })),
      advance: formValue.advance,
      beginDate: formValue.beginDate,
      expectedEndDate: formValue.expectedEndDate,
      totalAmount: formValue.totalAmount
    };

    const apiCall = this.creditId
      ? this.creditService.updateCredit(this.creditId, payload)
      : this.creditService.addCredit(payload);

    const submitSub = apiCall.subscribe({
      next: (response) => {
        this.spinner.hide();
        const body = response.body || response;

        if (body.statusCode === 200 || body.statusCode === 201) {
          const successMessage = this.creditId
            ? 'Crédit mis à jour avec succès'
            : 'Crédit ajouté avec succès';
          this.alertService.showSuccess(successMessage);
          this.router.navigate(['/credit-list']);
        } else {
          this.alertService.showError(body.message || 'Une erreur est survenue');
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        this.spinner.hide();
        this.alertService.showError('Erreur lors de la soumission du crédit : ' + err.message);
        this.isLoading = false;
        console.error(err);
      }
    });

    this.subscriptions.push(submitSub);
  }

  onTotalAmountChange(totalAmount: number): void {
    this.creditForm.patchValue({
      totalAmount: totalAmount
    }, { emitEvent: false });
  }

  searchClient = (term: string, item: any) => {
    term = term.toLowerCase();
    const fullName = `${item.firstname} ${item.lastname}`.toLowerCase();
    return fullName.includes(term);
  }

  onCancel(): void {
    this.router.navigate(['/credit-list']);
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
