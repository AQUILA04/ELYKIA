import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { OutService } from '../service/out.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-out-pdf-list',
  templateUrl: './out-pdf-list.component.html',
  styleUrls: ['./out-pdf-list.component.scss']
})
export class OutPdfListComponent {
  pdfFiles: any[] = [];
  selectedFiles: string[] = [];
  selectAll = false;

  constructor(
    private outService: OutService,
    private spinner: NgxSpinnerService,
    private alertService: AlertService
  ) {
   
  }

  ngOnInit() {
    this.listPdfFiles();
  }

  listPdfFiles() {
    this.spinner.show();
    this.outService.listPdfFiles().subscribe(
      (response: any) => {
        this.spinner.hide();
        this.pdfFiles = response;
      },
      (error: any) => {
        this.spinner.hide();
        this.alertService.showDefaultError('Erreur lors du chargement de la liste PDF');
      }
    );
  }

  toggleSelectAll() {
    this.selectedFiles = this.selectAll ? this.pdfFiles.map(f => f.filename) : [];
  }

  toggleFileSelection(filename: string) {
    const index = this.selectedFiles.indexOf(filename);
    if (index === -1) {
      this.selectedFiles.push(filename);
    } else {
      this.selectedFiles.splice(index, 1);
    }
    this.selectAll = this.selectedFiles.length === this.pdfFiles.length;
  }

  downloadFile(filename: string) {
    this.spinner.show();
    this.outService.downloadFile(filename).subscribe(
      (response: Blob) => {
        this.spinner.hide();
        
        // Créer un blob à partir de la réponse
        const blob = new Blob([response], { type: 'application/pdf' });
        
        // Créer un lien de téléchargement
        const downloadLink = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        
        downloadLink.href = url;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        // Nettoyer
        window.URL.revokeObjectURL(url);
        document.body.removeChild(downloadLink);
      },
      (error: any) => {
        this.spinner.hide();
        this.alertService.showDefaultError('Erreur lors du téléchargement du fichier');
      }
    );
  }

  downloadSelected() {
    this.spinner.show();
    this.outService.downloadSelected(this.selectedFiles).subscribe(
      (response: Blob) => {
        this.spinner.hide();
        
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        
        const blob = new Blob([response], { type: 'application/zip' });
        const downloadLink = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        
        downloadLink.href = url;
        downloadLink.download = `fichiers_selectionnes_${dateStr}.zip`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(downloadLink);
      },
      (error: any) => {
        this.spinner.hide();
        this.alertService.showDefaultError('Erreur lors du téléchargement des fichiers sélectionnés');
      }
    );
  }

  downloadAll() {
    this.spinner.show();
    this.outService.downloadAllToday().subscribe(
      (response: Blob) => {
        this.spinner.hide();
        
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        
        const blob = new Blob([response], { type: 'application/zip' });
        const downloadLink = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        
        downloadLink.href = url;
        downloadLink.download = `tous_les_fichiers_${dateStr}.zip`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(downloadLink);
      },
      (error: any) => {
        this.spinner.hide();
        this.alertService.showDefaultError('Erreur lors du téléchargement de tous les fichiers !');
      }
    );
  }
}
