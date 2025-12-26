import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CreditService } from '../service/credit.service';
import { ClientService } from '../../client/service/client.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { Subscription } from 'rxjs';
import { AlertService } from 'src/app/shared/service/alert.service';
import {AuthService} from "../../auth/service/auth.service"; // Assurez-vous d'importer AlertService

@Component({
  selector: 'app-distribution',
  templateUrl: './distribution.component.html',
  styleUrls: ['./distribution.component.scss']
})
export class DistributionComponent implements OnInit, OnDestroy {
  distributionForm!: FormGroup;
  clients: any[] = [];
  articles: any[] = [];
  isLoading = false;
  creditId?: number;

  availableArticlesPerRow: any[][] = [];
  private formChangesSubscription!: Subscription;

  constructor(
    private formBuilder: FormBuilder,
    private creditService: CreditService,
    private clientService: ClientService,
    private router: Router,
    private route: ActivatedRoute,
    private spinner: NgxSpinnerService,
    private tokenStorage: TokenStorageService,
    private alertService: AlertService, // Assurez-vous d'injecter AlertService
    private authService: AuthService
  ) {
    // MODIFIÉ : Ajout du champ 'advance'
    this.distributionForm = this.formBuilder.group({
      clientId: ['', Validators.required],
      advance: [0, [Validators.required, Validators.min(0)]], // Ajout du champ 'advance'
      articles: this.formBuilder.array([])
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    if (this.formChangesSubscription) {
      this.formChangesSubscription.unsubscribe();
    }
  }

  loadInitialData(): void {
    this.creditId = +this.route.snapshot.params['id'];
    if (!this.creditId) {
      this.router.navigate(['/credit-list']);
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    this.spinner.show();
    this.clientService.getClients(0, 100000, 'id,desc', currentUser).subscribe(clientData => {
      this.clients = clientData.data.content.filter((c: any) => c.clientType === 'CLIENT');
    });

    this.creditService.getCreditById(this.creditId).subscribe(
      (creditData: any) => {
        this.articles = creditData.data.articles;
        this.articlesArray.clear();
        this.addArticle();
        this.updateAvailableArticleLists();
        this.listenForFormChanges();
        this.spinner.hide();
      },
      error => {
        console.error('Erreur lors du chargement du crédit', error);
        this.spinner.hide();
      }
    );
  }

  get articlesArray(): FormArray {
    return this.distributionForm.get('articles') as FormArray;
  }

  searchClient = (term: string, item: any) => {
    term = term.toLowerCase();
    const fullName = `${item.firstname} ${item.lastname}`.toLowerCase();
    return fullName.includes(term);
  }

  searchArticle = (term: string, item: any) => {
    term = term.toLowerCase();
    return item.commercialName && (item.commercialName.toLowerCase().includes(term) || item.name.toLowerCase().includes(term));
  }

  createArticle(): FormGroup {
    const articleGroup = this.formBuilder.group({
      articleId: [null, Validators.required],
      quantity: [null, [Validators.required, Validators.min(1)]]
    });

    articleGroup.get('articleId')?.valueChanges.subscribe(articleId => {
      if (articleId) {
        this.updateMaxQuantityValidator(articleGroup, articleId);
      }
    });

    return articleGroup;
  }

  addArticle(): void {
    this.articlesArray.push(this.createArticle());
    this.updateAvailableArticleLists();
  }

  deleteArticle(index: number): void {
    this.articlesArray.removeAt(index);
    this.updateAvailableArticleLists();
  }

  listenForFormChanges(): void {
    if (this.formChangesSubscription) {
      this.formChangesSubscription.unsubscribe();
    }
    this.formChangesSubscription = this.articlesArray.valueChanges.subscribe(() => {
      this.updateAvailableArticleLists();
    });
  }

  updateAvailableArticleLists(): void {
    const allControls = this.articlesArray.controls;
    this.availableArticlesPerRow = allControls.map((_, currentIndex) => {
      const selectedIdsInOtherRows = allControls
        .filter((__, index) => index !== currentIndex)
        .map(control => control.get('articleId')?.value)
        .filter(id => id != null);

      const availableWrappers = this.articles.filter(
        wrapper => !selectedIdsInOtherRows.includes(wrapper.articles.id)
      );

      return availableWrappers.map(wrapper => wrapper.articles);
    });
  }

  updateMaxQuantityValidator(articleGroup: AbstractControl, articleId: number): void {
    if (!articleId || !this.creditId) {
      return;
    }

    const quantityControl = articleGroup.get('quantity');
    if (!quantityControl) return;

    quantityControl.setValue(null);
    quantityControl.setValidators([Validators.required, Validators.min(1)]);
    quantityControl.updateValueAndValidity();

    this.creditService.getArticleQuantityDistributed(this.creditId, articleId).subscribe(
      resp => {
        const totalDistributed = resp.data;
        const selectedArticle = this.articles.find(a => a.articles.id === articleId);
        const maxQuantity = selectedArticle ? (selectedArticle.quantity - totalDistributed) : 0;

        quantityControl.setValidators([
          Validators.required,
          Validators.min(1),
          Validators.max(maxQuantity)
        ]);
        quantityControl.updateValueAndValidity();
      }
    );
  }

  getMaxQuantityForError(index: number): number {
      const quantityControl = this.articlesArray.at(index)?.get('quantity');
      const errors = quantityControl?.errors;
      if (errors && errors['max']) {
          return errors['max'].max;
      }
      return 0;
  }

  onSubmit(): void {
    if (this.distributionForm.valid && this.creditId) {
      this.spinner.show();
      const formValue = this.distributionForm.value;

      // MODIFIÉ : Ajout de 'advance' dans l'objet envoyé
      const dto = {
        creditId: this.creditId,
        clientId: formValue.clientId,
        advance: formValue.advance, // Ajout de l'avance
        articles: {
          articleEntries: formValue.articles.map((article: any) => ({
            articleId: article.articleId,
            quantity: article.quantity
          }))
        }
      };

      this.isLoading = true;
      this.creditService.distributeArticles(dto).subscribe({
        next: (response) => {
          if(response.statusCode === 200 || response.statusCode === 201 ){
            this.spinner.hide();
                      this.isLoading = false;
                      this.alertService.showSuccess('Distribution effectuée avec succès.');
                      this.router.navigate(['/credit-list']);

            }else{
              this.spinner.hide();
                        this.isLoading = false;
                        // MODIFIÉ : Afficher le message d'erreur du backend s'il existe
                        const errorMessage = response.message || 'Erreur lors de la distribution';
                        this.alertService.showError(errorMessage);
                        console.error('Erreur lors de la distribution', response);
              }

        },
        error: (error) => {
          this.spinner.hide();
          this.isLoading = false;
          // MODIFIÉ : Afficher le message d'erreur du backend s'il existe
          const errorMessage = error.error?.message || 'Erreur lors de la distribution';
          this.alertService.showError(errorMessage);
          console.error('Erreur lors de la distribution', error);
        }
    });
    }
  }

  onCancel(): void {
    this.router.navigate(['/credit-list']);
  }
}
