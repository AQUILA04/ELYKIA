package com.optimize.elykia.core.service;

import com.optimize.elykia.core.dto.CommercialDataSummaryDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Service pour générer le résumé des données d'un commercial
 * Utilisé pour vérifier la complétude de l'initialisation mobile
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@Slf4j
public class CommercialDataSummaryService {

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Génère un résumé complet des données d'un commercial
     * @param commercialUsername Username du commercial
     * @return DTO contenant tous les totaux
     */
    public CommercialDataSummaryDto generateSummary(String commercialUsername) {
        log.info("Generating data summary for commercial: {}", commercialUsername);
        
        CommercialDataSummaryDto summary = new CommercialDataSummaryDto();
        summary.setCommercialUsername(commercialUsername);
        summary.setGeneratedAt(LocalDateTime.now());
        
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        
        try {
            // Clients - Compter les clients du commercial
            Long totalClients = ((Number) entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM client WHERE collector = :collector")
                .setParameter("collector", commercialUsername)
                .getSingleResult()).longValue();
            summary.setTotalClients(totalClients);
            
            // Distributions (crédits actifs) - Compter les crédits en cours
            Long totalDistributions = ((Number) entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM credit WHERE collector = :collector AND status = 'INPROGRESS'")
                .setParameter("collector", commercialUsername)
                .getSingleResult()).longValue();
            summary.setTotalDistributions(totalDistributions);
            
            // Recouvrements des 30 derniers jours
            Long totalRecoveries = ((Number) entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM credit_timeline WHERE collector = :collector " +
                "AND created_date >= :dateFrom AND created_date <= :dateTo")
                .setParameter("collector", commercialUsername)
                .setParameter("dateFrom", thirtyDaysAgo)
                .setParameter("dateTo", LocalDateTime.now())
                .getSingleResult()).longValue();
            summary.setTotalRecoveries(totalRecoveries);
            
            // Membres de tontine
            Long totalTontineMembers = ((Number) entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM tontine_member WHERE collector = :collector")
                .setParameter("collector", commercialUsername)
                .getSingleResult()).longValue();
            summary.setTotalTontineMembers(totalTontineMembers);
            
            // Collectes de tontine des 30 derniers jours
            Long totalTontineCollections = ((Number) entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM tontine_collection WHERE collector = :collector " +
                "AND created_date >= :dateFrom AND created_date <= :dateTo")
                .setParameter("collector", commercialUsername)
                .setParameter("dateFrom", thirtyDaysAgo)
                .setParameter("dateTo", LocalDateTime.now())
                .getSingleResult()).longValue();
            summary.setTotalTontineCollections(totalTontineCollections);
            
            // Livraisons de tontine des 30 derniers jours
            Long totalTontineDeliveries = ((Number) entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM tontine_delivery WHERE collector = :collector " +
                "AND created_date >= :dateFrom AND created_date <= :dateTo")
                .setParameter("collector", commercialUsername)
                .setParameter("dateFrom", thirtyDaysAgo)
                .setParameter("dateTo", LocalDateTime.now())
                .getSingleResult()).longValue();
            summary.setTotalTontineDeliveries(totalTontineDeliveries);
            
            // Articles (tous les articles disponibles)
            Long totalArticles = ((Number) entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM articles")
                .getSingleResult()).longValue();
            summary.setTotalArticles(totalArticles);
            
            // Localités (toutes les localités)
            Long totalLocalities = ((Number) entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM locality")
                .getSingleResult()).longValue();
            summary.setTotalLocalities(totalLocalities);
            
            // StockOutputs et Accounts - À implémenter selon la structure
            summary.setTotalStockOutputs(0L);
            summary.setTotalAccounts(0L);
            
            log.info("Summary generated for {}: {} clients, {} distributions, {} recoveries, {} tontine members", 
                commercialUsername,
                summary.getTotalClients(), 
                summary.getTotalDistributions(), 
                summary.getTotalRecoveries(),
                summary.getTotalTontineMembers()
            );
            
        } catch (Exception e) {
            log.error("Error generating summary for commercial {}: {}", commercialUsername, e.getMessage());
            throw new RuntimeException("Failed to generate data summary", e);
        }
        
        return summary;
    }
}
