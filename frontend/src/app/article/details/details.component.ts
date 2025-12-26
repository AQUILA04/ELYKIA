import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemService, Article } from '../service/item.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { StockValues } from '../service/item.service';
import {AuthService} from "../../auth/service/auth.service";

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss']
})
export class DetailComponent implements OnInit {
  article: Article | undefined;
  isLoading = true;
  stockValues: StockValues | null = null;

  // NOUVEAU : Les variables pour la gestion des rôles
  isGestionnaire: boolean = false;
  canViewCreditPrice: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private itemService: ItemService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private spinner: NgxSpinnerService,
    private authService: AuthService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    // On vérifie les rôles de l'utilisateur au démarrage du composant
    this.checkUserRoles();

    this.route.params.subscribe(params => {
      const articleId = +params['id'];
      this.loadArticle(articleId);
      this.loadStockValues();
    });
  }

  /**
   * NOUVEAU : Méthode privée pour vérifier les rôles de l'utilisateur
   * et définir les permissions d'affichage.
   */
  private checkUserRoles(): void {
    try {
      const user = this.authService.getCurrentUser();
      if (user && user.roles && Array.isArray(user.roles)) {
        const roles = user.roles;

        // 1. On définit si l'utilisateur est un "Gestionnaire"
        // On garde la même logique : un gestionnaire est celui qui peut valider un crédit.
        this.isGestionnaire = roles.includes('ROLE_VALIDATE_CREDIT');

        // 2. On définit qui peut voir le prix de vente à crédit
        this.canViewCreditPrice =
          roles.includes('ROLE_VALIDATE_CREDIT') || // Le gestionnaire
          roles.includes('ROLE_CONSULT_CLIENT') ||      // Le secrétaire
          roles.includes('ROLE_PROMOTER');       // Le commercial
      }
    } catch (e) {
      console.error('Impossible de lire les informations utilisateur', e);
      // En cas d'erreur, on désactive toutes les permissions par sécurité
      this.isGestionnaire = false;
      this.canViewCreditPrice = false;
    }
  }

  loadStockValues(): void {
      this.itemService.getDetailedStockValues().subscribe({
        next: (values) => {
          this.stockValues = values;
        },
        error: (err) => {
          console.error('Erreur lors de la récupération des valeurs du stock', err);
        }
      });
    }

  onCancel(): void {
    this.router.navigate(['/list']);
  }

  navigateToEdit(articleId:number): void {
    this.router.navigate(['/add', articleId]);
  }

  loadArticle(articleId: number): void {
    this.spinner.show();
    this.itemService.getArticleById(articleId).subscribe(
      data => {
        this.spinner.hide();
        this.article = data?.data;
        this.isLoading = false;
      },
      error => {
        this.spinner.hide();
        console.error('Erreur lors de la récupération des détails de l\'article', error);
        this.isLoading = false;
      }
    );
  }
}
