import { Component, OnInit } from '@angular/core';
import {OutService} from "../service/out.service";
import {NgxSpinnerService} from "ngx-spinner";
import {AlertService} from "../../shared/service/alert.service";

@Component({
  selector: 'app-old-release-list',
  templateUrl: './old-release-list.component.html',
  styleUrls: ['./old-release-list.component.scss']
})
export class OldReleaseListComponent implements OnInit {
  oldReleaseFolder: any[] = [];

  constructor(
    private outService: OutService,
    private spinner: NgxSpinnerService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.listOldReleaseFolders();
  }

  listOldReleaseFolders() {
    this.spinner.show();
    this.outService.listOldReleaseDoc().subscribe(
      (response: any) => {
        this.spinner.hide();
        this.oldReleaseFolder = response;
      },
      (error: any) => {
        this.spinner.hide();
        this.alertService.showDefaultError('Erreur lors du chargement de la liste des archives de sorties d\'articles');
      }
    );
  }

  downloadFile(filename: string) {
    this.spinner.show();
    this.outService.downloadByReleaseDate(filename).subscribe(
      (response: Blob) => {
        this.spinner.hide();

        const blob = new Blob([response], { type: 'application/zip' });
        const downloadLink = document.createElement('a');
        const url = window.URL.createObjectURL(blob);

        downloadLink.href = url;
        downloadLink.download = `SORTIE_ARTICLES_${filename}.zip`;
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
