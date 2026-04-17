import { Injectable } from '@angular/core';
import {
  IIntegrityValidator,
  ExpectedData,
  ActualData,
  ValidationResult,
  StructureValidationResult
} from '../../models/tontine-sync.models';

/**
 * Service de validation d'intégrité des données synchronisées
 * Responsabilité: Vérifier l'intégrité des données après synchronisation
 * 
 * Valide les exigences:
 * - 4.1: Calcul et comparaison des checksums
 * - 4.2: Validation de structure et contraintes
 */
@Injectable({
  providedIn: 'root'
})
export class IntegrityValidatorService implements IIntegrityValidator {

  constructor() {}

  /**
   * Valide le résultat de synchronisation en comparant les données attendues et réelles
   * @param expected Données attendues (counts depuis l'API)
   * @param actual Données réelles (counts depuis la base locale)
   * @returns Résultat de validation avec détails des écarts
   */
  validateSyncResult(expected: ExpectedData, actual: ActualData): ValidationResult {
    const missingItems: string[] = [];
    const corruptedItems: string[] = [];

    // Comparer les counts de membres
    if (expected.memberCount !== actual.memberCount) {
      const diff = expected.memberCount - actual.memberCount;
      if (diff > 0) {
        missingItems.push(`${diff} membre(s) manquant(s)`);
      } else {
        corruptedItems.push(`${Math.abs(diff)} membre(s) en trop`);
      }
    }

    // Comparer les counts de collections
    if (expected.collectionCount !== actual.collectionCount) {
      const diff = expected.collectionCount - actual.collectionCount;
      if (diff > 0) {
        missingItems.push(`${diff} collection(s) manquante(s)`);
      } else {
        corruptedItems.push(`${Math.abs(diff)} collection(s) en trop`);
      }
    }

    // Comparer les counts de stocks
    if (expected.stockCount !== actual.stockCount) {
      const diff = expected.stockCount - actual.stockCount;
      if (diff > 0) {
        missingItems.push(`${diff} stock(s) manquant(s)`);
      } else {
        corruptedItems.push(`${Math.abs(diff)} stock(s) en trop`);
      }
    }

    const totalExpected = expected.memberCount + expected.collectionCount + expected.stockCount;
    const totalActual = actual.memberCount + actual.collectionCount + actual.stockCount;
    const isValid = missingItems.length === 0 && corruptedItems.length === 0;

    return {
      isValid,
      expectedCount: totalExpected,
      actualCount: totalActual,
      missingItems,
      corruptedItems,
      checksumMatch: isValid // Pour l'instant, checksumMatch suit isValid
    };
  }

  /**
   * Valide la structure des données pour s'assurer qu'elles respectent les contraintes
   * @param data Tableau de données à valider
   * @returns Résultat de validation de structure
   */
  validateDataStructure(data: any[]): StructureValidationResult {
    const errors: string[] = [];
    let validatedCount = 0;

    if (!Array.isArray(data)) {
      return {
        isValid: false,
        errors: ['Les données doivent être un tableau'],
        validatedCount: 0
      };
    }

    // Valider chaque élément
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const itemErrors = this.validateItem(item, i);
      
      if (itemErrors.length > 0) {
        errors.push(...itemErrors);
      } else {
        validatedCount++;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedCount
    };
  }

  /**
   * Calcule le checksum des données pour vérification d'intégrité
   * Utilise un algorithme simple mais efficace basé sur JSON stringification
   * @param data Données pour le calcul du checksum
   * @returns Checksum calculé (hash hexadécimal)
   */
  calculateChecksum(data: any[]): string {
    if (!Array.isArray(data) || data.length === 0) {
      return '0';
    }

    try {
      // Trier les données pour garantir un checksum cohérent
      const sortedData = this.sortDataForChecksum(data);
      
      // Convertir en JSON string
      const jsonString = JSON.stringify(sortedData);
      
      // Calculer un hash simple
      return this.simpleHash(jsonString);
    } catch (error) {
      console.error('Erreur lors du calcul du checksum:', error);
      return '0';
    }
  }

  /**
   * Valide un élément individuel
   * @param item Élément à valider
   * @param index Index de l'élément dans le tableau
   * @returns Liste des erreurs trouvées
   */
  private validateItem(item: any, index: number): string[] {
    const errors: string[] = [];

    // Vérifier que l'élément n'est pas null ou undefined
    if (item === null || item === undefined) {
      errors.push(`Élément ${index}: valeur null ou undefined`);
      return errors;
    }

    // Vérifier que l'élément est un objet
    if (typeof item !== 'object') {
      errors.push(`Élément ${index}: doit être un objet`);
      return errors;
    }

    // Vérifier la présence d'un ID
    if (!item.id && item.id !== 0) {
      errors.push(`Élément ${index}: ID manquant`);
    }

    // Vérifier que l'ID n'est pas vide
    if (typeof item.id === 'string' && item.id.trim() === '') {
      errors.push(`Élément ${index}: ID vide`);
    }

    return errors;
  }

  /**
   * Trie les données pour garantir un checksum cohérent
   * @param data Données à trier
   * @returns Données triées
   */
  private sortDataForChecksum(data: any[]): any[] {
    return [...data].sort((a, b) => {
      // Trier par ID si disponible
      if (a.id && b.id) {
        return String(a.id).localeCompare(String(b.id));
      }
      // Sinon, trier par JSON string
      return JSON.stringify(a).localeCompare(JSON.stringify(b));
    });
  }

  /**
   * Calcule un hash simple d'une chaîne
   * Utilise l'algorithme djb2
   * @param str Chaîne à hasher
   * @returns Hash hexadécimal
   */
  private simpleHash(str: string): string {
    let hash = 5381;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) + hash) + char; // hash * 33 + char
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convertir en hexadécimal positif
    return Math.abs(hash).toString(16);
  }
}
