import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Client } from '../../models/client.model';
import { Distribution } from '../../models/distribution.model';
import { Recovery } from '../../models/recovery.model';
import { TontineMember } from '../../models/tontine.model';

export interface MatchResult {
  localId: string;
  localEntityType: 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery';
  localEntityName: string;
  suggestedParentId: string;
  suggestedParentName: string;
  confidence: number; // 0-100
  reason: string;
}

export interface MatchingSummary {
  totalLocalUnsynced: number;
  totalMatches: number;
  highConfidenceMatches: number; // >= 90%
  mediumConfidenceMatches: number; // 70-89%
  lowConfidenceMatches: number; // < 70%
  matches: MatchResult[];
}

@Injectable({
  providedIn: 'root'
})
export class SyncDependencyMatcherService {

  constructor(private databaseService: DatabaseService) {}

  /**
   * Détecte automatiquement les correspondances entre éléments locaux non synchronisés
   * et leurs parents potentiels sur le serveur
   */
  async detectDependencyMatches(): Promise<MatchingSummary> {
    const startTime = Date.now();
    const timeout = 5000; // 5 secondes max
    
    const allMatches: MatchResult[] = [];
    
    try {
      // Traiter chaque type d'entité avec timeout
      const distributionMatches = await this.matchDistributionsWithTimeout(timeout - (Date.now() - startTime));
      allMatches.push(...distributionMatches);
      
      if (Date.now() - startTime >= timeout) {
        console.warn('Timeout atteint pour la détection automatique');
        return this.buildSummary(allMatches);
      }
      
      const recoveryMatches = await this.matchRecoveriesWithTimeout(timeout - (Date.now() - startTime));
      allMatches.push(...recoveryMatches);
      
      if (Date.now() - startTime >= timeout) {
        console.warn('Timeout atteint pour la détection automatique');
        return this.buildSummary(allMatches);
      }
      
      const tontineMemberMatches = await this.matchTontineMembersWithTimeout(timeout - (Date.now() - startTime));
      allMatches.push(...tontineMemberMatches);
      
      if (Date.now() - startTime >= timeout) {
        console.warn('Timeout atteint pour la détection automatique');
        return this.buildSummary(allMatches);
      }
      
      const tontineCollectionMatches = await this.matchTontineCollectionsWithTimeout(timeout - (Date.now() - startTime));
      allMatches.push(...tontineCollectionMatches);
      
      if (Date.now() - startTime >= timeout) {
        console.warn('Timeout atteint pour la détection automatique');
        return this.buildSummary(allMatches);
      }
      
      const tontineDeliveryMatches = await this.matchTontineDeliveriesWithTimeout(timeout - (Date.now() - startTime));
      allMatches.push(...tontineDeliveryMatches);
      
    } catch (error) {
      console.error('Erreur lors de la détection automatique:', error);
    }
    
    return this.buildSummary(allMatches);
  }

  /**
   * Matcher les distributions avec leurs clients
   */
  private async matchDistributionsWithTimeout(remainingTime: number): Promise<MatchResult[]> {
    if (remainingTime <= 0) return [];
    
    const matches: MatchResult[] = [];
    
    // Récupérer les distributions locales non synchronisées
    const unsyncedDistributions = await this.databaseService.getUnsyncedDistributions();
    
    // Récupérer les clients synchronisés (potentiels parents)
    const syncedClients = await this.databaseService.getSyncedClients();
    
    // Créer un index pour accès rapide
    const clientsMap = new Map<string, Client>();
    syncedClients.forEach(client => clientsMap.set(client.id, client));
    
    // Traiter par batch de 50
    const batchSize = 50;
    for (let i = 0; i < unsyncedDistributions.length; i += batchSize) {
      const batch = unsyncedDistributions.slice(i, i + batchSize);
      
      for (const distribution of batch) {
        // Vérifier si le client actuel existe et est synchronisé
        const currentClient = clientsMap.get(distribution.clientId);
        
        if (!currentClient) {
          // Le client n'existe pas ou n'est pas synchronisé, chercher une correspondance
          const match = await this.findBestClientMatch(distribution, syncedClients);
          if (match) {
            matches.push({
              localId: distribution.id,
              localEntityType: 'distribution',
              localEntityName: `Distribution ${distribution.totalAmount} FCFA`,
              suggestedParentId: match.client.id,
              suggestedParentName: match.client.fullName || `${match.client.firstname} ${match.client.lastname}`,
              confidence: match.confidence,
              reason: match.reason
            });
          }
        }
      }
      
      // Yield pour ne pas bloquer le thread
      await this.sleep(0);
    }
    
    return matches;
  }

  /**
   * Matcher les recouvrements avec leurs distributions
   */
  private async matchRecoveriesWithTimeout(remainingTime: number): Promise<MatchResult[]> {
    if (remainingTime <= 0) return [];
    
    const matches: MatchResult[] = [];
    
    const unsyncedRecoveries = await this.databaseService.getUnsyncedRecoveries();
    const syncedDistributions = await this.databaseService.getSyncedDistributions();
    
    const distributionsMap = new Map<string, Distribution>();
    syncedDistributions.forEach(dist => distributionsMap.set(dist.id, dist));
    
    const batchSize = 50;
    for (let i = 0; i < unsyncedRecoveries.length; i += batchSize) {
      const batch = unsyncedRecoveries.slice(i, i + batchSize);
      
      for (const recovery of batch) {
        const currentDistribution = distributionsMap.get(recovery.distributionId);
        
        if (!currentDistribution) {
          const match = await this.findBestDistributionMatch(recovery, syncedDistributions);
          if (match) {
            matches.push({
              localId: recovery.id,
              localEntityType: 'recovery',
              localEntityName: `Recouvrement ${recovery.amount} FCFA`,
              suggestedParentId: match.distribution.id,
              suggestedParentName: `Distribution ${match.distribution.totalAmount} FCFA`,
              confidence: match.confidence,
              reason: match.reason
            });
          }
        }
      }
      
      await this.sleep(0);
    }
    
    return matches;
  }

  /**
   * Matcher les membres tontine avec leurs clients
   */
  private async matchTontineMembersWithTimeout(remainingTime: number): Promise<MatchResult[]> {
    if (remainingTime <= 0) return [];
    
    const matches: MatchResult[] = [];
    
    const unsyncedMembers = await this.databaseService.getUnsyncedTontineMembers();
    const syncedClients = await this.databaseService.getSyncedClients();
    
    const clientsMap = new Map<string, Client>();
    syncedClients.forEach(client => clientsMap.set(client.id, client));
    
    const batchSize = 50;
    for (let i = 0; i < unsyncedMembers.length; i += batchSize) {
      const batch = unsyncedMembers.slice(i, i + batchSize);
      
      for (const member of batch) {
        const currentClient = clientsMap.get(member.clientId);
        
        if (!currentClient) {
          const match = await this.findBestClientMatchForMember(member, syncedClients);
          if (match) {
            matches.push({
              localId: member.id,
              localEntityType: 'tontine-member',
              localEntityName: `Membre ${member.clientId}`,
              suggestedParentId: match.client.id,
              suggestedParentName: match.client.fullName || `${match.client.firstname} ${match.client.lastname}`,
              confidence: match.confidence,
              reason: match.reason
            });
          }
        }
      }
      
      await this.sleep(0);
    }
    
    return matches;
  }

  /**
   * Matcher les collectes tontine avec leurs membres
   */
  private async matchTontineCollectionsWithTimeout(remainingTime: number): Promise<MatchResult[]> {
    if (remainingTime <= 0) return [];
    
    const matches: MatchResult[] = [];
    
    const unsyncedCollections = await this.databaseService.getUnsyncedTontineCollections();
    const syncedMembers = await this.databaseService.getSyncedTontineMembers();
    
    const membersMap = new Map<string, TontineMember>();
    syncedMembers.forEach(member => membersMap.set(member.id, member));
    
    const batchSize = 50;
    for (let i = 0; i < unsyncedCollections.length; i += batchSize) {
      const batch = unsyncedCollections.slice(i, i + batchSize);
      
      for (const collection of batch) {
        const currentMember = membersMap.get(collection.memberId);
        
        if (!currentMember) {
          const match = await this.findBestMemberMatchForCollection(collection, syncedMembers);
          if (match) {
            matches.push({
              localId: collection.id,
              localEntityType: 'tontine-collection',
              localEntityName: `Collecte ${collection.amount} FCFA`,
              suggestedParentId: match.member.id,
              suggestedParentName: `Membre ${match.member.clientId}`,
              confidence: match.confidence,
              reason: match.reason
            });
          }
        }
      }
      
      await this.sleep(0);
    }
    
    return matches;
  }

  /**
   * Matcher les livraisons tontine avec leurs membres
   */
  private async matchTontineDeliveriesWithTimeout(remainingTime: number): Promise<MatchResult[]> {
    if (remainingTime <= 0) return [];
    
    const matches: MatchResult[] = [];
    
    const unsyncedDeliveries = await this.databaseService.getUnsyncedTontineDeliveries();
    const syncedMembers = await this.databaseService.getSyncedTontineMembers();
    
    const membersMap = new Map<string, TontineMember>();
    syncedMembers.forEach(member => membersMap.set(member.id, member));
    
    const batchSize = 50;
    for (let i = 0; i < unsyncedDeliveries.length; i += batchSize) {
      const batch = unsyncedDeliveries.slice(i, i + batchSize);
      
      for (const delivery of batch) {
        const currentMember = membersMap.get(delivery.memberId);
        
        if (!currentMember) {
          const match = await this.findBestMemberMatchForDelivery(delivery, syncedMembers);
          if (match) {
            matches.push({
              localId: delivery.id,
              localEntityType: 'tontine-delivery',
              localEntityName: `Livraison ${delivery.amount} FCFA`,
              suggestedParentId: match.member.id,
              suggestedParentName: `Membre ${match.member.clientId}`,
              confidence: match.confidence,
              reason: match.reason
            });
          }
        }
      }
      
      await this.sleep(0);
    }
    
    return matches;
  }

  /**
   * Trouver le meilleur client correspondant pour une distribution
   */
  private async findBestClientMatch(distribution: Distribution, clients: Client[]): Promise<{ client: Client, confidence: number, reason: string } | null> {
    // Filtrer par date (même jour)
    const distributionDate = new Date(distribution.createdAt);
    const candidateClients = clients.filter(client => {
      if (!client.createdAt) return false;
      const clientDate = new Date(client.createdAt);
      return this.isSameDay(distributionDate, clientDate);
    });
    
    if (candidateClients.length === 0) return null;
    
    // Chercher par nom exact (si disponible dans distribution)
    // Note: Adapter selon la structure réelle de Distribution
    // Pour l'instant, on retourne null car Distribution ne contient pas le nom du client
    
    return null;
  }

  /**
   * Trouver la meilleure distribution correspondante pour un recouvrement
   */
  private async findBestDistributionMatch(recovery: Recovery, distributions: Distribution[]): Promise<{ distribution: Distribution, confidence: number, reason: string } | null> {
    // Filtrer par date (même jour ou avant)
    const recoveryDate = new Date(recovery.createdAt);
    const candidateDistributions = distributions.filter(dist => {
      const distDate = new Date(dist.createdAt);
      return distDate <= recoveryDate && this.isWithinDays(distDate, recoveryDate, 30);
    });
    
    if (candidateDistributions.length === 0) return null;
    
    // Chercher par montant similaire
    const matchingDistributions = candidateDistributions.filter(dist => 
      Math.abs(dist.totalAmount - recovery.amount) < 100 // Tolérance de 100 FCFA
    );
    
    if (matchingDistributions.length === 1) {
      return {
        distribution: matchingDistributions[0],
        confidence: 85,
        reason: 'Montant et date correspondants'
      };
    }
    
    return null;
  }

  /**
   * Trouver le meilleur client correspondant pour un membre tontine
   */
  private async findBestClientMatchForMember(member: TontineMember, clients: Client[]): Promise<{ client: Client, confidence: number, reason: string } | null> {
    // Chercher par nom exact (utiliser fullName ou concat firstname + lastname)
    const matchingClients = clients.filter(client => {
      const clientFullName = client.fullName || `${client.firstname} ${client.lastname}`;
      const memberName = member.clientId; // TontineMember n'a pas de nom, utiliser clientId pour le matching
      return clientFullName.toLowerCase().trim() === memberName.toLowerCase().trim();
    });
    
    if (matchingClients.length === 1) {
      return {
        client: matchingClients[0],
        confidence: 95,
        reason: 'Nom identique'
      };
    }
    
    // Chercher par similarité de nom
    const similarClients = clients.filter(client => {
      const clientFullName = client.fullName || `${client.firstname} ${client.lastname}`;
      return this.calculateSimilarity(clientFullName, member.clientId) > 0.8;
    });
    
    if (similarClients.length === 1) {
      return {
        client: similarClients[0],
        confidence: 75,
        reason: 'Nom similaire'
      };
    }
    
    return null;
  }

  /**
   * Trouver le meilleur membre correspondant pour une collecte
   */
  private async findBestMemberMatchForCollection(collection: any, members: TontineMember[]): Promise<{ member: TontineMember, confidence: number, reason: string } | null> {
    // Filtrer par date (même jour)
    const collectionDate = new Date(collection.createdAt);
    const candidateMembers = members.filter(member => {
      const memberDate = new Date(member.registrationDate);
      return this.isWithinDays(memberDate, collectionDate, 30);
    });
    
    if (candidateMembers.length === 0) return null;
    
    // Si un seul candidat, retourner avec confiance moyenne
    if (candidateMembers.length === 1) {
      return {
        member: candidateMembers[0],
        confidence: 70,
        reason: 'Seul membre créé dans la période'
      };
    }
    
    return null;
  }

  /**
   * Trouver le meilleur membre correspondant pour une livraison
   */
  private async findBestMemberMatchForDelivery(delivery: any, members: TontineMember[]): Promise<{ member: TontineMember, confidence: number, reason: string } | null> {
    // Même logique que pour les collectes
    return this.findBestMemberMatchForCollection(delivery, members);
  }

  /**
   * Construire le résumé des correspondances
   */
  private buildSummary(matches: MatchResult[]): MatchingSummary {
    const highConfidence = matches.filter(m => m.confidence >= 90).length;
    const mediumConfidence = matches.filter(m => m.confidence >= 70 && m.confidence < 90).length;
    const lowConfidence = matches.filter(m => m.confidence < 70).length;
    
    return {
      totalLocalUnsynced: 0, // À calculer si nécessaire
      totalMatches: matches.length,
      highConfidenceMatches: highConfidence,
      mediumConfidenceMatches: mediumConfidence,
      lowConfidenceMatches: lowConfidence,
      matches
    };
  }

  /**
   * Utilitaires
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  private isWithinDays(date1: Date, date2: Date, days: number): boolean {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= days;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
