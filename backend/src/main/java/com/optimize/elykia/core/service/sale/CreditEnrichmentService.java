package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.enumaration.RiskLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Service pour enrichir automatiquement les crédits avec les données BI
 */
@Service
@Transactional
@RequiredArgsConstructor
public class CreditEnrichmentService {
    
    private final CreditPaymentEventService paymentEventService;
    
    /**
     * Enrichit un crédit avec toutes les métriques BI
     */
    public void enrichCredit(Credit credit) {
        calculateProfitMetrics(credit);
        calculatePaymentMetrics(credit);
        calculateDurationMetrics(credit);
        calculateRiskLevel(credit);
        calculateSeasonPeriod(credit);
    }
    
    /**
     * Calcule les métriques de profit
     */
    public void calculateProfitMetrics(Credit credit) {
        if (credit.getTotalAmount() != null && credit.getTotalPurchase() != null) {
            credit.setProfitMargin(credit.getTotalAmount() - credit.getTotalPurchase());
            
            if (credit.getTotalPurchase() > 0) {
                credit.setProfitMarginPercentage(
                    (credit.getProfitMargin() / credit.getTotalPurchase()) * 100
                );
            }
        }
    }
    
    /**
     * Calcule les métriques de paiement
     */
    public void calculatePaymentMetrics(Credit credit) {
        if (credit.getTotalAmount() != null && credit.getTotalAmount() > 0) {
            Double paid = credit.getTotalAmountPaid() != null ? credit.getTotalAmountPaid() : 0.0;
            credit.setPaymentCompletionRate((paid / credit.getTotalAmount()) * 100);
        }
        
        // Score de régularité basé sur l'historique des paiements
        if (credit.getId() != null) {
            Double regularityScore = paymentEventService.calculatePaymentRegularityScore(credit.getId());
            credit.setPaymentRegularityScore(regularityScore);
        }
    }
    
    /**
     * Calcule les durées
     */
    public void calculateDurationMetrics(Credit credit) {
        if (credit.getBeginDate() != null && credit.getExpectedEndDate() != null) {
            credit.setExpectedDurationDays(
                (int) ChronoUnit.DAYS.between(credit.getBeginDate(), credit.getExpectedEndDate())
            );
        }
        
        if (credit.getBeginDate() != null && credit.getEffectiveEndDate() != null) {
            credit.setActualDurationDays(
                (int) ChronoUnit.DAYS.between(credit.getBeginDate(), credit.getEffectiveEndDate())
            );
        }
    }
    
    /**
     * Calcule le niveau de risque
     */
    public void calculateRiskLevel(Credit credit) {
        int riskScore = 0;
        
        // Facteur 1: Retard
        if (credit.getLateDaysCount() != null) {
            if (credit.getLateDaysCount() > 30) riskScore += 40;
            else if (credit.getLateDaysCount() > 15) riskScore += 30;
            else if (credit.getLateDaysCount() > 7) riskScore += 20;
            else if (credit.getLateDaysCount() > 0) riskScore += 10;
        }
        
        // Facteur 2: Taux de paiement
        if (credit.getPaymentCompletionRate() != null) {
            if (credit.getPaymentCompletionRate() < 30) riskScore += 30;
            else if (credit.getPaymentCompletionRate() < 50) riskScore += 20;
            else if (credit.getPaymentCompletionRate() < 70) riskScore += 10;
        }
        
        // Facteur 3: Régularité des paiements
        if (credit.getPaymentRegularityScore() != null) {
            if (credit.getPaymentRegularityScore() < 50) riskScore += 20;
            else if (credit.getPaymentRegularityScore() < 70) riskScore += 10;
        }
        
        // Facteur 4: Montant restant élevé proche de la date de fin
        if (credit.getExpectedEndDate() != null && credit.getTotalAmountRemaining() != null) {
            long daysToEnd = ChronoUnit.DAYS.between(LocalDate.now(), credit.getExpectedEndDate());
            if (daysToEnd < 7 && credit.getTotalAmountRemaining() > credit.getTotalAmount() * 0.5) {
                riskScore += 20;
            }
        }
        
        // Détermination du niveau de risque
        if (riskScore >= 70) {
            credit.setRiskLevel(RiskLevel.CRITICAL);
        } else if (riskScore >= 50) {
            credit.setRiskLevel(RiskLevel.HIGH);
        } else if (riskScore >= 30) {
            credit.setRiskLevel(RiskLevel.MEDIUM);
        } else {
            credit.setRiskLevel(RiskLevel.LOW);
        }
    }
    
    /**
     * Calcule la période saisonnière
     */
    public void calculateSeasonPeriod(Credit credit) {
        if (credit.getAccountingDate() != null) {
            int month = credit.getAccountingDate().getMonthValue();
            
            if (month >= 1 && month <= 3) {
                credit.setSeasonPeriod("Q1");
            } else if (month >= 4 && month <= 6) {
                credit.setSeasonPeriod("Q2");
            } else if (month >= 7 && month <= 9) {
                credit.setSeasonPeriod("Q3");
            } else {
                credit.setSeasonPeriod("Q4");
            }
        }
    }
}
