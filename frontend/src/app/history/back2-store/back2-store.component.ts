import { Component, OnInit } from '@angular/core';
import { OutService } from "../../out/service/out.service";
import { ActivatedRoute, Router } from "@angular/router";
import { NgxSpinnerService } from "ngx-spinner";
import { TokenStorageService } from "../../shared/service/token-storage.service";
import { FormBuilder, FormGroup, FormArray, Validators, FormControl } from '@angular/forms';
import { ReturnArticlesDto } from './models/return-articles.dto';

@Component({
  selector: 'app-back2-store',
  templateUrl: './back2-store.component.html',
  styleUrls: ['./back2-store.component.scss']
})
export class Back2StoreComponent implements OnInit {

  creditId: number | null;
  articles: any[] = [];
  isLoading = true;
  backToStoreFormGroup!: FormGroup;
  allSelected = false; // <-- à ajouter
  anySelected = false;

  constructor(
    private route: ActivatedRoute,
    private spinner: NgxSpinnerService,
    private router: Router,
    private formBuilder: FormBuilder,
    private tokenStorage: TokenStorageService,
    private outService: OutService
  ) {
    this.tokenStorage.checkConnectedUser();
    this.creditId = null;
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const creditId = +params['id'];
      this.creditId = creditId;
      this.getBackToStoreArticles(creditId);
    });
  }

  getBackToStoreArticles(creditId: number): void {
    this.spinner.show();
    this.outService.getBackToStore(creditId).subscribe(
      (data: any) => {
        this.articles = data.data;
        this.articles = this.articles.filter(a => a.quantity > 0);
        this.initForm();
        this.isLoading = false;
        this.spinner.hide();
      },
      error => {
        console.error('Erreur lors du chargement des détails de la vente', error);
        this.isLoading = false;
        this.spinner.hide();
      }
    );
  }

  private initForm(): void {
    const quantitiesArray = this.formBuilder.array(
      this.articles.map(() => new FormControl({ value: '', disabled: true }))
    );
    const group: any = {
      quantities: quantitiesArray
    };
    this.articles.forEach((_, i) => {
      group['selected_' + i] = new FormControl(false);
    });
    this.backToStoreFormGroup = this.formBuilder.group(group);
  }

  onSelectLine(i: number): void {
    const selected = this.backToStoreFormGroup.get('selected_' + i)?.value;
    const quantitiesArray = this.backToStoreFormGroup.get('quantities') as FormArray;
    const control = quantitiesArray.at(i);
    if (selected) {
      control.enable();
      control.setValidators([Validators.required, Validators.min(1)]);
    } else {
      control.disable();
      control.setValue('');
      control.clearValidators();
    }
    control.updateValueAndValidity();
    this.updateAnySelected();
  }

  onSubmit(): void {
    console.log('onSubmit appelé');
    const quantities = (this.backToStoreFormGroup.get('quantities') as FormArray).getRawValue();
    const selectedIndexes = this.articles
      .map((_, i) => i)
      .filter(i => this.backToStoreFormGroup.get('selected_' + i)?.value);

    if (selectedIndexes.length === 0) {
      return; // rien à faire si aucune ligne sélectionnée
    }

    // Vérifier que tous les champs sélectionnés sont valides
    let valid = true;
    selectedIndexes.forEach(i => {
      const control = (this.backToStoreFormGroup.get('quantities') as FormArray).at(i);
      if (control.invalid) {
        control.markAsTouched();
        valid = false;
      }
    });
    if (!valid) return;

    this.spinner.show();

    const dto: ReturnArticlesDto = {
      creditId: this.creditId!,
      returnArticles: selectedIndexes.map(i => ({
        articleId: this.articles[i].articles.id,
        quantity: quantities[i]
      }))
    };

    this.outService.makeBackToStore(dto).subscribe({
      next: () => {
        this.spinner.hide();
        this.router.navigate(['/history']); // Redirection vers la liste des historiques
      },
      error: () => {
        this.spinner.hide();
      }
    });
  }

  toggleAllSelection(event: Event): void {
  const checked = (event.target as HTMLInputElement).checked;
  this.allSelected = checked;
  this.articles.forEach((_, i) => {
    this.backToStoreFormGroup.get('selected_' + i)?.setValue(checked);
    this.onSelectLine(i);
  });
  this.updateAnySelected();
}


updateAnySelected(): void {
  this.anySelected = this.articles.some((_, i) => this.backToStoreFormGroup.get('selected_' + i)?.value);
  this.allSelected = this.articles.length > 0 && this.articles.every((_, i) => this.backToStoreFormGroup.get('selected_' + i)?.value);
}


}
