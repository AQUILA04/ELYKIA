import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CreditService } from '../service/credit.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-change-daily-stake',
  templateUrl: './change-daily-stake.component.html',
  styleUrls: ['./change-daily-stake.component.scss']
})
export class ChangeDailyStakeComponent implements OnInit {
  creditId!: number;
  newDailyStake!: number;
  currentDailyStake!: number; // Pour stocker la mise actuelle
  isLoading = true; // Pour gérer l'état de chargement initial

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private creditService: CreditService,
    private alertService: AlertService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.creditId = +id;
      this.loadCreditDetails(); // Charger les détails pour obtenir la mise actuelle
    } else {
      this.alertService.showError("ID du crédit non trouvé.");
      this.router.navigate(['/credit-list']);
    }
  }

  loadCreditDetails(): void {
    this.isLoading = true;
    this.creditService.getCreditById(this.creditId).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.currentDailyStake = response.data.dailyStake;
          this.newDailyStake = response.data.dailyStake; // Pré-remplir avec la valeur actuelle
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.alertService.showError("Erreur", "Erreur lors du chargement des détails du crédit.");
        console.error(err);
      }
    });
  }

  onSubmit(): void {
    if (!this.newDailyStake || this.newDailyStake <= 0) {
      this.alertService.showError("Validation", "Veuillez entrer un montant valide.");
      return;
    }

    if (this.newDailyStake === this.currentDailyStake) {
      this.alertService.showWarning("Information", "La nouvelle mise est identique à l'ancienne.");
      return;
    }

    const dto = {
      creditId: this.creditId,
      dailyStake: this.newDailyStake
    };

    this.spinner.show();
    this.creditService.changeDailyStake(dto).subscribe({
      next: (response) => {
        this.spinner.hide();
        this.alertService.showSuccess("Succès", "La mise journalière a été modifiée avec succès !");
        this.router.navigate(['/credit-list']);
      },
      // #### CORRECTION FINALE APPLIQUÉE ICI ####
      error: (err: any) => {
        this.spinner.hide();
        this.isLoading = false;
        console.error("Objet d'erreur complet reçu :", err);

        // Cas 1 : L'erreur est un objet JSON structuré (le cas idéal)
        if (err.error && typeof err.error === 'object' && err.error.message) {
          this.alertService.showError('Erreur de validation', err.error.message);
        }
        // Cas 2 : L'erreur est une simple chaîne de caractères (votre cas actuel)
        else if (err.error && typeof err.error === 'string') {
          this.alertService.showError('Erreur du serveur', err.error);
        }
        // Cas 3 : Pour toutes les autres erreurs inattendues
        else {
          this.alertService.showError('Erreur', 'Une erreur inattendue est survenue.');
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/credit-list']);
  }
}

