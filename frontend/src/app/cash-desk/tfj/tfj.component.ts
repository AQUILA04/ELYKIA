import { Component, OnInit, ViewChild } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';
import { CashDeskService } from '../service/cash-desk.service';
import { MatTableDataSource } from '@angular/material/table';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NgxSpinnerService } from 'ngx-spinner';
import { SpecialDailyStakeDto, DefaultDailyStakeDto, TicketingDto } from '../default-daily-stake-dto';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { Router } from "@angular/router";
import { AlertService } from 'src/app/shared/service/alert.service';
import { concatMap } from 'rxjs/operators'; // <-- IMPORT AJOUTÉ

interface GroupedData {
  quarter: string;
  credits: any[];
  dataSource: MatTableDataSource<any>;
}

@Component({
  selector: 'app-tfj',
  templateUrl: './tfj.component.html',
  styleUrls: ['./tfj.component.scss']
})
export class TFJComponent implements OnInit {
  @ViewChild('stepper') stepper!: MatStepper;

  displayedColumns: string[] = ['fullName', 'reference', 'dailyStake', 'remainingPayment', 'multiplier'];
  groupedData: GroupedData[] = [];
  filteredGroupedData: GroupedData[] = [];
  multipliers: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  firstFormGroup!: FormGroup;
  secondFormGroup!: FormGroup;
  thirdFormGroup!: FormGroup;

  collector: string | null = null;
  normalStake: any[] = [];
  specialStake: any[] = [];
  totalAmount: number = 0;
  systemBalance: number = 0;
  realBalance: number = 0;
  status: string = '';
  isLoading = false;
  ticketingData: { [key: string]: number } = {};
  isNextButtonDisabled: boolean = true;
  searchTerm: string = '';

  constructor(
    private cashDeskService: CashDeskService,
    private formBuilder: FormBuilder,
    private spinner: NgxSpinnerService,
    private tokenStorage: TokenStorageService,
    private router: Router,
    private alertService: AlertService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.collector = localStorage.getItem('username');
    this.firstFormGroup = this.formBuilder.group({});
    this.secondFormGroup = this.formBuilder.group({});
    this.thirdFormGroup = this.formBuilder.group({});
    this.loadDailyOperations();
  }

  loadDailyOperations(): void {
    this.spinner.show();
    this.cashDeskService.getAllCreditsByCollectorV2().subscribe({
        next: (data) => {
            this.groupedData = this.createGroupedData(data);
            this.filteredGroupedData = [...this.groupedData];

            if (this.groupedData.length === 0 || this.groupedData.every(group => group.credits.length === 0)) {
                this.alertService.showError('Erreur', 'Aucune opération journalière disponible!');
                this.isNextButtonDisabled = true;
            } else {
                this.isNextButtonDisabled = false;
            }
            this.spinner.hide();
        },
        error: (err) => {
            this.alertService.showError('Erreur de chargement', 'Impossible de récupérer les opérations.');
            this.spinner.hide();
        }
    });
  }

  createGroupedData(groupedData: { [key: string]: any[] }): GroupedData[] {
    const groups: GroupedData[] = [];
    for (const [quarter, credits] of Object.entries(groupedData)) {
      const processedCredits = credits.map(item => ({
        ...item,
        selectedMultiplier: 0,
        calculatedAmount: 0
      }));
      const dataSource = new MatTableDataSource(processedCredits);
      groups.push({
        quarter: quarter,
        credits: processedCredits,
        dataSource: dataSource
      });
    }
    return groups;
  }

  setMultiplier(element: any, multiplier: number, groupIndex: number): void {
    element.selectedMultiplier = multiplier;
    element.calculatedAmount = element.dailyStake * multiplier;

    const group = this.filteredGroupedData[groupIndex];
    const originalGroup = this.groupedData.find(g => g.quarter === group.quarter);
    if (originalGroup) {
      const originalElement = originalGroup.credits.find(c => c.id === element.id);
      if (originalElement) {
        originalElement.selectedMultiplier = multiplier;
        originalElement.calculatedAmount = element.calculatedAmount;
      }
    }

    // CORRIGÉ (BUG #2) : Force la mise à jour visuelle du tableau
    group.dataSource.data = [...group.credits];
  }

  getMultiplierTooltip(multiplier: number, dailyStake: number): string {
    if (multiplier === 0) return 'Aucune collecte';
    const amount = dailyStake * multiplier;
    return `${multiplier}x = ${amount.toLocaleString('fr-FR')} XOF`;
  }

  hasValidationError(element: any): boolean {
    return element.selectedMultiplier > 0 &&
      (element.dailyStake * element.selectedMultiplier) > element.totalAmountRemaining;
  }

  // CORRIGÉ (BUG #1) : Vérifie les sélections sur les données filtrées
  hasAnySelection(): boolean {
    return this.filteredGroupedData.some(group =>
      group.credits.some(credit => credit.selectedMultiplier > 0)
    );
  }

  // CORRIGÉ (BUG #1) : Valide les sélections sur les données filtrées
  hasValidSelections(): boolean {
    if (!this.hasAnySelection()) {
        return false;
    }
    // Vérifie qu'il n'y a aucune erreur de validation dans les lignes visibles
    return !this.filteredGroupedData.some(group =>
      group.credits.some(credit => this.hasValidationError(credit))
    );
  }

  // CORRIGÉ (BUG #1) : Calcule sur les données filtrées
  getNormalStakeCount(): number {
    return this.filteredGroupedData.reduce((count, group) => {
      return count + group.credits.filter(credit => credit.selectedMultiplier === 1).length;
    }, 0);
  }

  // CORRIGÉ (BUG #1) : Calcule sur les données filtrées
  getSpecialStakeCount(): number {
    return this.filteredGroupedData.reduce((count, group) => {
      return count + group.credits.filter(credit => credit.selectedMultiplier > 1).length;
    }, 0);
  }

  // CORRIGÉ (BUG #1) : Calcule sur les données filtrées
  getTotalEstimatedAmount(): number {
    return this.filteredGroupedData.reduce((total, group) => {
      return total + group.credits.reduce((groupTotal, credit) => {
        if (credit.selectedMultiplier > 0 && !this.hasValidationError(credit)) {
          return groupTotal + (credit.dailyStake * credit.selectedMultiplier);
        }
        return groupTotal;
      }, 0);
    }, 0);
  }

  // CORRIGÉ (BUG #1 & #3) : Soumet uniquement les données visibles et filtrées, sans localStorage
  onSubmitUnifiedStep(): void {
    if (!this.hasValidSelections()) {
      this.alertService.showError('Erreur', 'Veuillez corriger les erreurs ou sélectionner au moins un élément valide.');
      return;
    }

    this.normalStake = [];
    this.specialStake = [];

    this.filteredGroupedData.forEach(group => {
      group.credits.forEach(credit => {
        if (credit.selectedMultiplier > 0 && !this.hasValidationError(credit)) {
          if (credit.selectedMultiplier === 1) {
            this.normalStake.push({
              clientId: credit.client.id,
              creditId: credit.id
            });
          } else {
            this.specialStake.push({
              clientId: credit.client.id,
              creditId: credit.id,
              amount: credit.dailyStake * credit.selectedMultiplier
            });
          }
        }
      });
    });

    this.stepper.next();
  }

  onSearch(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredGroupedData = [...this.groupedData];
    } else {
      this.filteredGroupedData = this.groupedData.map(group => {
        const quarterMatch = group.quarter.toLowerCase().includes(term);
        const filteredCredits = group.credits.filter(credit => {
          if (quarterMatch) return true;
          const fullName = `${credit.client.firstname} ${credit.client.lastname}`.toLowerCase();
          return fullName.includes(term);
        });
        return { ...group, credits: filteredCredits, dataSource: new MatTableDataSource(filteredCredits) };
      }).filter(group => group.credits.length > 0);
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  onSubmitStep2(billetageData: { totalAmount: number, ticketingData: { [key: string]: number } }): void {
    this.totalAmount = billetageData.totalAmount;
    this.ticketingData = billetageData.ticketingData;
    this.submitData();
  }

  // CORRIGÉ (BUG #4) : Chaînage propre des appels API avec concatMap
  submitData(): void {
    const defaultDailyStakeDto: DefaultDailyStakeDto = {
      clientIds: this.normalStake.map(stake => stake.clientId),
      collector: this.collector,
      creditIds: this.normalStake.map(stake => stake.creditId),
    };

    const specialDailyStakeDto: SpecialDailyStakeDto = {
      stakeUnits: this.specialStake,
      collector: this.collector || '',
    };

    const ticketingDto: TicketingDto = {
      collector: this.collector || '',
      totalAmount: this.totalAmount,
      ticketingJson: JSON.stringify(this.ticketingData)
    };

    this.spinner.show();

    this.cashDeskService.submitOperations(defaultDailyStakeDto).pipe(
      concatMap(() => this.cashDeskService.submitSpecialDailyStake(specialDailyStakeDto)),
      concatMap(() => this.cashDeskService.submitTicketing(ticketingDto))
    ).subscribe({
        next: (response: any) => {
            this.spinner.hide();
            this.systemBalance = response.data.systemBalance;
            this.realBalance = response.data.realBalance;
            this.status = response.data.status;
            this.stepper.next();
        },
        error: (err) => {
            console.error('Erreur lors de la soumission des données:', err);
            this.alertService.showError('Erreur', 'Une erreur est survenue lors de la soumission des données.');
            this.spinner.hide();
        }
    });
  }

  finish(): void {
    this.cashDeskService.closeCashDesk().subscribe(() => {
        this.alertService.showDefaultSucces('La caisse a été fermée avec succès !');
        this.router.navigate(['/open-cashDesk']);
      }
    );
  }
}
