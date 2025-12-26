package com.optimize.elykia.core.service;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.entity.CommercialPerformance;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.RiskLevel;
import com.optimize.elykia.core.repository.CommercialPerformanceRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class CommercialPerformanceService extends GenericService<CommercialPerformance, Long> {
    
    private final CommercialPerformanceRepository performanceRepository;
    private final CreditRepository creditRepository;
    private final CreditTimelineRepository timelineRepository;

    public CommercialPerformanceService(CommercialPerformanceRepository repository,
                                        CommercialPerformanceRepository performanceRepository,
                                        CreditRepository creditRepository,
                                        CreditTimelineRepository timelineRepository) {
        super(repository);
        this.performanceRepository = performanceRepository;
        this.creditRepository = creditRepository;
        this.timelineRepository = timelineRepository;
    }

    /**
     * Calcule et enregistre la performance d'un commercial pour une période
     */
    public CommercialPerformance calculatePerformance(String collector, LocalDate periodStart, LocalDate periodEnd) {
        CommercialPerformance performance = performanceRepository
            .findByCollectorAndPeriodStartAndPeriodEnd(collector, periodStart, periodEnd)
            .orElse(new CommercialPerformance());
        
        performance.setCollector(collector);
        performance.setPeriodStart(periodStart);
        performance.setPeriodEnd(periodEnd);
        
        // Métriques de vente
        List<Credit> periodCredits = creditRepository
            .findByCollectorAndAccountingDateBetweenAndClientType(collector, periodStart, periodEnd, ClientType.CLIENT);
        
        performance.setTotalSalesCount(periodCredits.size());
        performance.setTotalSalesAmount(
            periodCredits.stream().mapToDouble(Credit::getTotalAmount).sum()
        );
        performance.setTotalProfit(
            periodCredits.stream()
                .mapToDouble(c -> c.getTotalAmount() - c.getTotalPurchase())
                .sum()
        );
        
        if (periodCredits.size() > 0) {
            performance.setAverageSaleAmount(
                performance.getTotalSalesAmount() / periodCredits.size()
            );
        }
        
        // Métriques de recouvrement
        LocalDateTime startDateTime = periodStart.atStartOfDay();
        LocalDateTime endDateTime = periodEnd.atTime(23, 59, 59);
        
        Double collected = timelineRepository.sumAmountByCollectorAndDate(
            collector, startDateTime, endDateTime
        );
        performance.setTotalCollected(collected != null ? collected : 0.0);
        
        if (performance.getTotalSalesAmount() > 0) {
            performance.setCollectionRate(
                (performance.getTotalCollected() / performance.getTotalSalesAmount()) * 100
            );
        }
        
        // Métriques de risque
        List<Credit> activeCredits = creditRepository
            .findByCollectorAndStatusAndClientType(collector, CreditStatus.INPROGRESS, ClientType.CLIENT);
        
        performance.setActiveClientsCount(
            (int) activeCredits.stream()
                .map(Credit::getClientId)
                .distinct()
                .count()
        );
        
        performance.setPortfolioAtRisk(
            activeCredits.stream()
                .filter(c -> c.getExpectedEndDate() != null && 
                            c.getExpectedEndDate().isBefore(LocalDate.now()))
                .mapToDouble(Credit::getTotalAmountRemaining)
                .sum()
        );
        
        performance.setCriticalAccountsCount(
            (int) activeCredits.stream()
                .filter(c -> RiskLevel.CRITICAL.equals(c.getRiskLevel()))
                .count()
        );
        
        return performanceRepository.save(performance);
    }
    
    /**
     * Calcule les performances de tous les commerciaux pour une période
     */
    public List<CommercialPerformance> calculateAllPerformances(LocalDate periodStart, LocalDate periodEnd) {
        List<String> collectors = creditRepository.findDistinctCollectors();
        
        return collectors.stream()
            .map(collector -> calculatePerformance(collector, periodStart, periodEnd))
            .toList();
    }
    
    /**
     * Calcule les performances du mois en cours
     */
    public List<CommercialPerformance> calculateCurrentMonthPerformances() {
        LocalDate now = LocalDate.now();
        LocalDate startOfMonth = now.withDayOfMonth(1);
        return calculateAllPerformances(startOfMonth, now);
    }
}
