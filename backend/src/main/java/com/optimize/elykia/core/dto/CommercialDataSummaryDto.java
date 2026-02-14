package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO pour le résumé des données d'un commercial
 * Utilisé pour vérifier la complétude de l'initialisation mobile
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommercialDataSummaryDto {
    /**
     * Username du commercial
     */
    private String commercialUsername;
    
    /**
     * Date et heure de génération du résumé
     */
    private LocalDateTime generatedAt;
    
    /**
     * Nombre total de clients du commercial
     */
    private Long totalClients;
    
    /**
     * Nombre total de distributions (crédits) actives
     */
    private Long totalDistributions;
    
    /**
     * Nombre total de recouvrements des 30 derniers jours
     */
    private Long totalRecoveries;
    
    /**
     * Nombre total de membres de tontine
     */
    private Long totalTontineMembers;
    
    /**
     * Nombre total de collectes de tontine des 30 derniers jours
     */
    private Long totalTontineCollections;
    
    /**
     * Nombre total de livraisons de tontine des 30 derniers jours
     */
    private Long totalTontineDeliveries;
    
    /**
     * Nombre total d'articles disponibles
     */
    private Long totalArticles;
    
    /**
     * Nombre total de localités
     */
    private Long totalLocalities;
    
    /**
     * Nombre total de sorties de stock du commercial
     */
    private Long totalStockOutputs;
    
    /**
     * Nombre total de comptes du commercial
     */
    private Long totalAccounts;
}
