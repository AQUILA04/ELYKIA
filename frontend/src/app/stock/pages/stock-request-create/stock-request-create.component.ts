import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StockRequestService } from '../../services/stock-request.service';
import { AuthService } from 'src/app/auth/service/auth.service';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';
import { ClientService } from 'src/app/client/service/client.service';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { MonthEndCalculator } from '../../../shared/utils/month-end-calculator';
import { FeatureFlagService, FeatureFlags } from 'src/app/shared/service/feature-flag.service';
import { ArticleSelectorComponent } from 'src/app/credit/components/article-selector/article-selector.component';

@Component({
  selector: 'app-stock-request-create',
  templateUrl: './stock-request-create.component.html',
  styleUrls: ['./stock-request-create.component.scss']
})
export class StockRequestCreateComponent implements OnInit {

  @ViewChild(ArticleSelectorComponent) articleSelector?: ArticleSelectorComponent;

  form: FormGroup;
  agents: any[] = [];
  currentUser: any;

  daysUntilMonthEnd: number = -1;
  showMonthEndAlert: boolean = false;
  showNextMonthOption: boolean = false;
  forNextMonth: boolean = false;
  isSubmitting = false;
  isEditMode = false;
  requestId?: number;

  constructor(
    private fb: FormBuilder,
    private stockRequestService: StockRequestService,
    private authService: AuthService,
    private clientService: ClientService,
    private router: Router,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private userService: UserService,
    private featureFlagService: FeatureFlagService,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      items: [[], Validators.required], // Changed to single control for ArticleSelector
      collector: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.calculateDaysUntilMonthEnd();
    this.currentUser = this.authService.getCurrentUser();
    this.loadAgents();

    if (this.userService.hasProfile(UserProfile.PROMOTER)) {
      this.form.patchValue({ collector: this.currentUser.username });
      this.form.get('collector')?.disable();
    }

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.requestId = +id;
        this.loadRequest(this.requestId);
      }
    });
  }

  loadRequest(id: number): void {
    this.spinner.show();
    this.stockRequestService.getById(id).subscribe({
      next: (req) => {
        const initialItems = req.items?.map(item => ({
          articleId: item.article?.id,
          quantity: item.quantity
        })) ?? [];

        this.form.patchValue({
          collector: req.collector,
          items: initialItems
        });
        this.spinner.hide();
      },
      error: (err) => {
        this.toastr.error('Erreur lors du chargement de la demande');
        this.spinner.hide();
      }
    });
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
    if (this.isSubmitting) {
      return;
    }

    if (this.form.invalid) {
      return;
    }

    this.isSubmitting = true;
    const formValue = this.form.getRawValue();
    // ArticleSelector returns [{articleId: 1, quantity: 5}, ...]
    // Mapper needs to find the Article object if the backend expects the full object,
    // or just send IDs if the backend supports it.
    // Based on previous code: "article: item.article" (full object)
    // We need to map back from ID to object.

    const items = formValue.items.map((item: any) => {
      const articleObj = this.articleSelector?.getArticle(item.articleId);
      return {
        article: articleObj,
        quantity: item.quantity
      };
    });

    const request = {
      collector: formValue.collector,
      items: items
    };

    this.spinner.show();

    if (this.isEditMode && this.requestId) {
      this.stockRequestService.update(this.requestId, request as any).subscribe({
        next: (resp: any) => {
          if (resp && resp.statusCode && resp.statusCode !== 200) {
            this.toastr.error(resp.message || 'Erreur lors de la modification de la demande');
            this.spinner.hide();
            this.isSubmitting = false;
          } else {
            this.toastr.success('Demande modifiée avec succès');
            this.spinner.hide();
            this.router.navigate(['/stock/request']);
          }
        },
        error: (error: any) => {
          this.toastr.error(error.error?.message || error.message || 'Erreur lors de la modification de la demande');
          this.spinner.hide();
          this.isSubmitting = false;
        }
      });
    } else {
      const requestDto = {
        request: request,
        forNextMonth: this.forNextMonth
      };

      this.stockRequestService.create(requestDto).subscribe({
        next: (resp: any) => {
          if (resp && resp.statusCode && resp.statusCode !== 200) {
            this.toastr.error(resp.message || 'Erreur lors de la création de la demande');
            this.spinner.hide();
            this.isSubmitting = false;
          } else {
            this.toastr.success('Demande créée avec succès');
            this.spinner.hide();
            this.router.navigate(['/stock/request']);
          }
        },
        error: (error: any) => {
          this.toastr.error(error.error?.message || error.message || 'Erreur lors de la création de la demande');
          this.spinner.hide();
          this.isSubmitting = false;
        }
      });
    }
  }
}
