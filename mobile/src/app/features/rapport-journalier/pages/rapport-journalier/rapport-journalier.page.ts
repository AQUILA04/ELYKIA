import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { PrintingService } from '../../../../core/services/printing.service';
import { RapportJournalierService, DailyReportData } from '../../services/rapport-journalier.service';
import { Printer } from '@bcyesil/capacitor-plugin-printer';
import { IonButton, IonContent, IonIcon } from '@ionic/angular/standalone';
import { CommonModule, DecimalPipe, registerLocaleData } from '@angular/common';
import { Component, OnInit, LOCALE_ID, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import localeFr from '@angular/common/locales/fr';
import localeFrExtra from '@angular/common/locales/extra/fr';
import { DatabaseService } from '../../../../core/services/database.service';
import * as html2pdf from 'html2pdf.js';

// Register French locale data
registerLocaleData(localeFr, 'fr-FR', localeFrExtra);
@Component({
  selector: 'app-rapport-journalier',
  templateUrl: './rapport-journalier.page.html',
  styleUrls: ['./rapport-journalier.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    IonContent,
    IonButton,
    IonIcon,
    ScrollingModule
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'fr-FR' }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RapportJournalierPage {

  reportData: DailyReportData = {
    date: new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    commercialName: '',
    totalToPay: 0,
    distributions: {
      count: 0,
      totalAmount: 0,
      items: []
    },
    recoveries: {
      count: 0,
      totalAmount: 0,
      items: []
    },
    newClients: {
      count: 0,
      totalBalance: 0,
      items: []
    },
    advances: {
      count: 0,
      totalAmount: 0
    },
    tontine: {
      count: 0,
      totalAmount: 0
    }
  };

  activeTab: 'distributions' | 'recouvrements' | 'clients' = 'distributions';

  constructor(
    private router: Router,
    private store: Store,
    private printingService: PrintingService,
    private rapportJournalierService: RapportJournalierService,
    private databaseService: DatabaseService,
    private cdr: ChangeDetectorRef
  ) { }

  ionViewWillEnter() {
    this.loadReportData();
  }

  private loadReportData() {
    this.rapportJournalierService.getDailyReport().subscribe({
      next: (data) => {
        this.reportData = data;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données du rapport:', error);
        this.cdr.markForCheck();
      }
    });
  }



  goBack() {
    this.router.navigate(['/tabs/dashboard']);
  }

  switchTab(tab: 'distributions' | 'recouvrements' | 'clients') {
    this.activeTab = tab;
    this.cdr.markForCheck();
  }

  // TrackBy functions pour optimiser le rendu des listes
  trackByDistributionId(index: number, item: any): string {
    return item.id || `${item.clientName}-${item.time}-${index}`;
  }

  trackByRecoveryId(index: number, item: any): string {
    return item.id || `${item.clientName}-${item.time}-${index}`;
  }

  trackByClientId(index: number, item: any): string {
    return item.id || `${item.clientName}-${item.time}-${index}`;
  }

  async printReport() {
    try {
      const htmlContent = this.rapportJournalierService.generateReportHTML(this.reportData);

      // Utiliser le plugin Capacitor Printer
      await Printer.print({
        content: htmlContent,
        name: `rapport_journalier_${new Date().toISOString().split('T')[0]}`
      });

      console.log('Rapport imprimé avec succès');

      // Save the report to the database
      const commercial = await this.databaseService.getCommercial();
      if (commercial) {
        await this.databaseService.saveDailyReport(this.reportData, commercial.id);
      } else {
        console.error('Commercial not found, cannot save daily report.');
      }

    } catch (error) {
      console.error('Erreur lors de l\'impression:', error);
      // En cas d\'erreur d\'impression, proposer de sauvegarder en PDF
      this.saveAsPDF();
    }
  }

  private saveAsPDF() {
    try {
      const htmlContent = this.rapportJournalierService.generateReportHTML(this.reportData);
      const options = {
        margin: 1,
        filename: `rapport_journalier_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      html2pdf().from(htmlContent).set(options).save();

    } catch (error) {
      console.error('Erreur lors de la sauvegarde PDF:', error);
    }
  }

  private generateReportHTML(): string {
    return this.rapportJournalierService.generateReportHTML(this.reportData);
  }
}
