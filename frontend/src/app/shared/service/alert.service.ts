import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor() { }
  showSuccess(message: string, title: string = 'Succès'): void {
    Swal.fire({
      icon: 'success',
      title: '<span style="font-size: 22px; font-weight: 600; color: #333;">' + title + '</span>',
      html: '<span style="font-size: 16px; color: #555;">' + message + '</span>',
      confirmButtonText: 'OK',
      buttonsStyling: false,
      customClass: {
        popup: 'custom-swal-popup',
        title: 'custom-swal-title',
        htmlContainer: 'custom-swal-html-container',
        confirmButton: 'custom-swal-confirm-button btn btn-success', // Ajout de btn-success
        cancelButton: 'custom-swal-cancel-button btn btn-outline-secondary'
      },
      backdrop: `
        rgba(0,0,123,0.4)
        url("assets/images/nyan-cat.gif") 
        left top
        no-repeat
      `
    });
  }

  showError(message: string, title: string = 'Erreur'): void {
    Swal.fire({
      icon: 'error',
      title: '<span style="font-size: 22px; font-weight: 600; color: #333;">' + title + '</span>',
      html: '<span style="font-size: 16px; color: #555;">' + message + '</span>',
      confirmButtonText: 'OK',
      buttonsStyling: false,
      customClass: {
        popup: 'custom-swal-popup',
        title: 'custom-swal-title',
        htmlContainer: 'custom-swal-html-container',
        confirmButton: 'custom-swal-confirm-button btn btn-danger', // Ajout de btn-danger
        cancelButton: 'custom-swal-cancel-button btn btn-outline-secondary'
      },
      backdrop: `
        rgba(0,0,123,0.4)
        url("assets/images/nyan-cat.gif") 
        left top
        no-repeat
      `
    });
  }

  showWarning(message: string, title: string = 'Avertissement'): void {
    Swal.fire({
      icon: 'question',
      title: '<span style="font-size: 22px; font-weight: 600; color: #333;">' + title + '</span>',
      html: '<span style="font-size: 16px; color: #555;">' + message + '</span>',
      confirmButtonText: 'OK',
      cancelButtonText: 'Annuler',
      buttonsStyling: false,
      customClass: {
        popup: 'custom-swal-popup',
        title: 'custom-swal-title',
        htmlContainer: 'custom-swal-html-container',
        confirmButton: 'custom-swal-confirm-button btn btn-primary', // Ajout de btn-warning
        cancelButton: 'custom-swal-cancel-button btn btn-outline-secondary'
      },
      reverseButtons: true,
      focusCancel: true,
      backdrop: `
        rgba(0,0,123,0.4)
        url("assets/images/nyan-cat.gif") 
        left top
        no-repeat
      `
    });
  }

  showConfirmation(title: string, text: string, confirmButtonText: string = 'Oui', cancelButtonText: string = 'Annuler'): Promise<boolean> {
    return Swal.fire({
      icon: 'question',
      title: '<span style="font-size: 22px; font-weight: 600; color: #333;">' + title + '</span>',
      html: '<span style="font-size: 16px; color: #555;">' + text + '</span>',
      showCancelButton: true,
      confirmButtonText: confirmButtonText,
      cancelButtonText: cancelButtonText,
      buttonsStyling: false,
      customClass: {
        popup: 'custom-swal-popup',
        title: 'custom-swal-title',
        htmlContainer: 'custom-swal-html-container',
        confirmButton: 'custom-swal-confirm-button btn btn-primary', // Utilisation de btn-primary pour la confirmation standard
        cancelButton: 'custom-swal-cancel-button btn btn-outline-secondary'
      },
      reverseButtons: true,
      focusCancel: true,
      backdrop: `
        rgba(0,0,123,0.4)
        url("assets/images/nyan-cat.gif") 
        left top
        no-repeat
      `
    }).then(result => result.isConfirmed);
  }

  showDeleteConfirmation(text: string): Promise<boolean> {
    return this.showConfirmation('Confimation de suppression', text, 'Supprimer', 'Annuler');
  }

  showDefaultSucces(message: string): void {
    this.showSuccess(message, 'Opération réussie');
  }

  showDefaultError(message: string): void {
    this.showError(message, 'Opération échouée');
  }

  showInfo(message: string, title: string = 'Information'): void {
    Swal.fire({
      icon: 'info', // Use info icon
      title: '<span style="font-size: 22px; font-weight: 600; color: #333;">' + title + '</span>',
      html: '<span style="font-size: 16px; color: #555;">' + message + '</span>',
      confirmButtonText: 'OK',
      buttonsStyling: false,
      customClass: {
        popup: 'custom-swal-popup',
        title: 'custom-swal-title',
        htmlContainer: 'custom-swal-html-container',
        confirmButton: 'custom-swal-confirm-button btn btn-info', // Use btn-info
        cancelButton: 'custom-swal-cancel-button btn btn-outline-secondary'
      },
      backdrop: `
        rgba(0,0,123,0.4)
        url("assets/images/nyan-cat.gif") 
        left top
        no-repeat
      `
    });
  }

}

