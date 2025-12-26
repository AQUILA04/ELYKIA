import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'licenseKeyFormatter'
})
export class LicenseKeyFormatterPipe implements PipeTransform {

  transform(value: string): string {
    if (!value) {
      return '';
    }
    // Supprimer les caractères non alphanumériques existants pour éviter les doublons de tirets
    const cleanedValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    let formattedValue = '';
    for (let i = 0; i < cleanedValue.length; i++) {
      if (i > 0 && i % 5 === 0) {
        formattedValue += '-';
      }
      formattedValue += cleanedValue[i];
    }
    // Limiter à la longueur attendue du format avec les tirets (29 caractères)
    return formattedValue.substring(0, 29);
  }
}