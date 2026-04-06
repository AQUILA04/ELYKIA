import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StockTontineRequestService } from '../../services/stock-tontine-request.service';
import { ItemService, Article } from '../../../article/service/item.service';
import { AuthService } from '../../../auth/service/auth.service';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';
import { ClientService } from '../../../client/service/client.service';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';

@Component({
  selector: 'app-stock-tontine-request-create',
  templateUrl: './stock-tontine-request-create.component.html',
  styleUrls: ['./stock-tontine-request-create.component.scss']
})
export class StockTontineRequestCreateComponent implements OnInit {

  form: FormGroup;
  articles: Article[] = [];
  agents: any[] = [];
  currentUser: any;

  constructor(
    private fb: FormBuilder,
    private requestService: StockTontineRequestService,
    private itemService: ItemService,
    private authService: AuthService,
    private clientService: ClientService,
    private router: Router,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private userService: UserService
  ) {
    this.form = this.fb.group({
      items: [[], Validators.required],
      collector: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadArticles();
    this.loadAgents();

    if (this.userService.hasProfile(UserProfile.PROMOTER)) {
      this.form.patchValue({ collector: this.currentUser.username });
      this.form.get('collector')?.disable();
    }
  }

  loadArticles() {
    this.spinner.show();
    this.itemService.getAllEnabledArticles().subscribe({
      next: (response: any) => {
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

  onSubmit() {
    if (this.form.invalid) {
      return;
    }

    const formValue = this.form.getRawValue();

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

    this.spinner.show();
    this.requestService.create(request).subscribe({
      next: () => {
        this.toastr.success('Demande créée avec succès');
        this.spinner.hide();
        this.router.navigate(['/stock-tontine/request']);
      },
      error: () => {
        this.toastr.error('Erreur lors de la création de la demande');
        this.spinner.hide();
      }
    });
  }
}
