import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StockRequestService } from '../../services/stock-request.service';
import { ItemService } from 'src/app/article/service/item.service';
import { AuthService } from 'src/app/auth/service/auth.service';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';
import { Article } from 'src/app/article/model/article.model';
import { ClientService } from 'src/app/client/service/client.service';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { MonthEndCalculator } from '../../../shared/utils/month-end-calculator';
import { FeatureFlagService, FeatureFlags } from 'src/app/shared/service/feature-flag.service';

@Component({
  selector: 'app-stock-request-create',
  templateUrl: './stock-request-create.component.html',
  styleUrls: ['./stock-request-create.component.scss']
})
export class StockRequestCreateComponent implements OnInit {

  form: FormGroup;
  articles: Article[] = []; // Typed as Article[]
  agents: any[] = [];
  currentUser: any;

  daysUntilMonthEnd: number = -1;
  showMonthEndAlert: boolean = false;
  showNextMonthOption: boolean = false;
  forNextMonth: boolean = false;

  constructor(
    private fb: FormBuilder,
    private stockRequestService: StockRequestService,
    private itemService: ItemService,
    private authService: AuthService,
    private clientService: ClientService,
    private router: Router,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private userService: UserService,
    private featureFlagService: FeatureFlagService
  ) {
    this.form = this.fb.group({
      items: [[], Validators.required], // Changed to single control for ArticleSelector
      collector: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.calculateDaysUntilMonthEnd();
    this.currentUser = this.authService.getCurrentUser();
    this.loadArticles();
    this.loadAgents();

    if (this.userService.hasProfile(UserProfile.PROMOTER)) {
      this.form.patchValue({ collector: this.currentUser.username });
      this.form.get('collector')?.disable();
    }
  }

  calculateDaysUntilMonthEnd() {
    this.daysUntilMonthEnd = MonthEndCalculator.getDaysUntilMonthEnd();
    const isEndOfMonth = this.daysUntilMonthEnd <= 5 && this.daysUntilMonthEnd >= 0;
    this.showMonthEndAlert = isEndOfMonth && this.featureFlagService.isFeatureEnabled(FeatureFlags.EndOfMonthAlerts);
    this.showNextMonthOption = isEndOfMonth && this.featureFlagService.isFeatureEnabled(FeatureFlags.NextMonthStockCreation);
  }

  onSelectNextMonth(forNext: boolean) {
    this.forNextMonth = forNext;
  }

  loadArticles() {
    this.spinner.show();
    this.itemService.getAllEnabledArticles().subscribe({
      next: (response: any) => {
        // According to reference: response.data.content
        this.articles = response.data?.content || response.data || [];
        this.spinner.hide();
      },
      error: (err) => {
        console.error('Erreur articles:', err);
        this.toastr.error('Erreur lors du chargement des articles');
        this.spinner.hide();
      }
    });
  }

  loadAgents(): void {
    this.clientService.getAgents().subscribe(
      data => {
        this.agents = data;
      },
      error => {
        console.error('Erreur lors du chargement des agents', error);
        this.toastr.error('Erreur lors du chargement des agents');
      }
    );
  }

  searchAgent = (term: string, item: any) => {
    return item.username.toLowerCase().includes(term.toLowerCase());
  }

  // Removed direct FormArray manipulation methods (addItem, removeItem)

  onSubmit() {
    if (this.form.invalid) {
      return;
    }

    const formValue = this.form.getRawValue();
    // ArticleSelector returns [{articleId: 1, quantity: 5}, ...]
    // Mapper needs to find the Article object if the backend expects the full object,
    // or just send IDs if the backend supports it.
    // Based on previous code: "article: item.article" (full object)
    // We need to map back from ID to object.

    const items = formValue.items.map((item: any) => {
      const articleObj = this.articles.find(a => a.id === item.articleId);
      return {
        article: articleObj,
        quantity: item.quantity
      };
    });

    const request = {
      collector: formValue.collector,
      items: items
    };

    const requestDto = {
      request: request,
      forNextMonth: this.forNextMonth
    };

    this.spinner.show();
    this.stockRequestService.create(requestDto).subscribe({
      next: (resp: any) => {
        if (resp && resp.statusCode && resp.statusCode !== 200) {
          this.toastr.error(resp.message || 'Erreur lors de la création de la demande');
          this.spinner.hide();
        } else {
          this.toastr.success('Demande créée avec succès');
          this.spinner.hide();
          this.router.navigate(['/stock/request']);
        }

      },
      error: (error: any) => {
        this.toastr.error(error.error?.message || error.message || 'Erreur lors de la création de la demande');
        this.spinner.hide();
      }
    });
  }
}
