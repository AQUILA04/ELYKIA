import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectAutomaticSyncStatus } from '../../../../store/sync/sync.selectors';
import { Observable } from 'rxjs';
import { PrintingService } from '../../../../core/services/printing.service';
import { RapportJournalierService, DailyReportData } from '../../services/rapport-journalier.service';
import { Printer } from '@bcyesil/capacitor-plugin-printer';
import { IonBadge, IonButton, IonContent, IonIcon, IonSegment, IonSegmentButton, IonLabel, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { CommonModule, DecimalPipe, registerLocaleData } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, LOCALE_ID, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import localeFr from '@angular/common/locales/fr';
import localeFrExtra from '@angular/common/locales/extra/fr';
import { DatabaseService } from '../../../../core/services/database.service';
import * as html2pdf from 'html2pdf.js';
import { PdfReportService } from '../../../../core/services/pdf-report.service';
import { SyncStatus } from '../../../../models/sync.model';

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
    FormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSpinner,
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

  activeTab: 'distributions' | 'recouvrements' | 'clients' | 'tontine-membres' | 'tontine-collectes' | 'tontine-livraisons' = 'distributions';
  isLoadingTab = false;
  private loadedTabs: Set<string> = new Set(['distributions', 'recouvrements', 'clients']); // Les 3 premiers onglets sont chargés au démarrage

  constructor(
    private router: Router,
    private store: Store,
    private printingService: PrintingService,
    private rapportJournalierService: RapportJournalierService,
    private databaseService: DatabaseService,
    private pdfReportService: PdfReportService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) { }

  ionViewWillEnter() {
    this.loadReportData();
    this.listenToSyncCompletion();
  }

  private loadReportData() {
    this.rapportJournalierService.getDailyReport().subscribe({
      next: (data) => {
        this.reportData = data;
        // Charger uniquement les counts des tontines pour les badges
        this.loadTontineCounts();
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

  /**
   * Charge uniquement les counts des tontines (optimisation)
   */
  private loadTontineCounts() {
    this.rapportJournalierService.getTontineCountsOnly().subscribe({
      next: (counts) => {
        this.reportData.tontineMembers = { count: counts.members, items: [] };
        this.reportData.tontineCollections = { count: counts.collections, totalAmount: 0, items: [] };
        this.reportData.tontineDeliveries = { count: counts.deliveries, totalAmount: 0, items: [] };
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des counts tontine:', error);
      }
    });
  }

  /**
   * Gère le changement d'onglet avec lazy loading
   */
  onSegmentChanged(event: any) {
    const newTab = event.detail.value;
    
    // Si l'onglet est déjà chargé, on ne fait rien
    if (this.loadedTabs.has(newTab)) {
      return;
    }

    // Charger les données de l'onglet tontine
    this.isLoadingTab = true;
    this.cdr.markForCheck();

    switch (newTab) {
      case 'tontine-membres':
        this.rapportJournalierService.getTontineMembersData().subscribe({
          next: (data) => {
            this.reportData.tontineMembers = data;
            this.loadedTabs.add(newTab);
            this.isLoadingTab = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Erreur lors du chargement des membres tontine:', error);
            this.isLoadingTab = false;
            this.cdr.markForCheck();
          }
        });
        break;

      case 'tontine-collectes':
        this.rapportJournalierService.getTontineCollectionsData().subscribe({
          next: (data) => {
            this.reportData.tontineCollections = data;
            this.loadedTabs.add(newTab);
            this.isLoadingTab = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Erreur lors du chargement des collectes tontine:', error);
            this.isLoadingTab = false;
            this.cdr.markForCheck();
          }
        });
        break;

      case 'tontine-livraisons':
        this.rapportJournalierService.getTontineDeliveriesData().subscribe({
          next: (data) => {
            this.reportData.tontineDeliveries = data;
            this.loadedTabs.add(newTab);
            this.isLoadingTab = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Erreur lors du chargement des livraisons tontine:', error);
            this.isLoadingTab = false;
            this.cdr.markForCheck();
          }
        });
        break;

      default:
        this.isLoadingTab = false;
        this.cdr.markForCheck();
    }
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

  trackByTontineMemberId(index: number, item: any): string {
    return item.id || `${item.memberName}-${item.time}-${index}`;
  }

  trackByTontineCollectionId(index: number, item: any): string {
    return item.id || `${item.memberName}-${item.time}-${index}`;
  }

  trackByTontineDeliveryId(index: number, item: any): string {
    return item.id || `${item.memberName}-${item.time}-${index}`;
  }

  /**
   * Écoute la fin de la synchronisation pour générer automatiquement le PDF
   */
  private listenToSyncCompletion() {
    this.store.select(selectAutomaticSyncStatus).subscribe(status => {
      if (status === SyncStatus.COMPLETED) {
        // Générer automatiquement le PDF après synchronisation
        this.generatePDFAfterSync();
      }
    });
  }

  /**
   * Génère automatiquement le PDF après synchronisation
   */
  private async generatePDFAfterSync() {
    try {
      console.log('Génération automatique du PDF après synchronisation...');
      
      // Recharger les données du rapport pour avoir les données synchronisées
      this.rapportJournalierService.getDailyReport().subscribe(async (data) => {
        this.reportData = data;
        
        // Générer le HTML pour PDF
        const htmlContent = this.rapportJournalierService.generatePDFHTML(this.reportData);
        
        // Générer le nom de fichier
        const filename = this.pdfReportService.generateFilename();
        
        // Générer le PDF
        const pdfBase64 = await this.pdfReportService.generatePDF(htmlContent, filename);
        
        // Sauvegarder dans External Storage
        await this.pdfReportService.savePDFToExternalStorage(pdfBase64, filename);
        
        console.log('PDF généré automatiquement avec succès:', filename);
        
        // Afficher un toast discret
        const toast = await this.toastController.create({
          message: `Rapport PDF généré automatiquement`,
          duration: 2000,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();
      });
      
    } catch (error) {
      console.error('Erreur lors de la génération automatique du PDF:', error);
    }
  }

  /**
   * Enregistre le rapport en PDF dans External Storage
   */
  async savePDF() {
    try {
      // Générer le HTML pour PDF (format complet avec tableaux)
      const htmlContent = this.rapportJournalierService.generatePDFHTML(this.reportData);
      
      // Générer le nom de fichier avec date et heure
      const filename = this.pdfReportService.generateFilename();
      
      // Afficher un toast de chargement
      const loadingToast = await this.toastController.create({
        message: 'Génération du PDF en cours...',
        duration: 0, // Pas de fermeture automatique
        position: 'bottom'
      });
      await loadingToast.present();
      
      // Générer le PDF
      const pdfBase64 = await this.pdfReportService.generatePDF(htmlContent, filename);
      
      // Sauvegarder dans External Storage
      const uri = await this.pdfReportService.savePDFToExternalStorage(pdfBase64, filename);
      
      // Fermer le toast de chargement
      await loadingToast.dismiss();
      
      // Afficher un toast de confirmation
      const successToast = await this.toastController.create({
        message: `PDF sauvegardé : ${filename}`,
        duration: 3000,
        color: 'success',
        position: 'bottom',
        buttons: [
          {
            text: 'OK',
            role: 'cancel'
          }
        ]
      });
      await successToast.present();
      
      console.log('PDF sauvegardé avec succès:', uri);
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du PDF:', error);
      
      const errorToast = await this.toastController.create({
        message: 'Erreur lors de la sauvegarde du PDF',
        duration: 3000,
        color: 'danger',
        position: 'bottom'
      });
      await errorToast.present();
    }
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
