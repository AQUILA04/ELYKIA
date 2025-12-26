package com.optimize.elykia.core.service;

import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.dto.bi.*;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class BiDashboardService {
    
    private final CreditRepository creditRepository;
    private final CreditTimelineRepository creditTimelineRepository;
    private final ArticlesService articlesService;
    private final StockMovementService stockMovementService;
    
    public DashboardOverviewDto getOverview(LocalDate startDate, LocalDate endDate) {
        SalesMetricsDto sales = getSalesMetrics(startDate, endDate);
        CollectionMetricsDto collections = getCollectionMetrics(startDate, endDate);
        StockMetricsDto stock = getStockMetrics();
        PortfolioMetricsDto portfolio = getPortfolioMetrics();
        
        return new DashboardOverviewDto(sales, collections, stock, portfolio);
    }
    
    public SalesMetricsDto getSalesMetrics(LocalDate startDate, LocalDate endDate) {
        List<Credit> credits = creditRepository.findByAccountingDateBetweenAndTypeAndClientType(startDate, endDate, OperationType.CREDIT, ClientType.CLIENT);
        
        Double totalAmount = credits.stream()
            .mapToDouble(Credit::getTotalAmount)
            .sum();
            
        Double totalProfit = credits.stream()
            .mapToDouble(c -> c.getTotalAmount() - c.getTotalPurchase())
            .sum();
            
        Double profitMargin = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0.0;
        
        Integer count = credits.size();
        
        Double averageSaleAmount = count > 0 ? totalAmount / count : 0.0;
        
        // Calcul de l'évolution (comparaison avec période précédente)
        long daysDiff = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate);
        LocalDate previousStart = startDate.minusDays(daysDiff);
        LocalDate previousEnd = startDate.minusDays(1);
        
        List<Credit> previousCredits = creditRepository.findByAccountingDateBetweenAndTypeAndClientType(previousStart, previousEnd, OperationType.CREDIT, ClientType.CLIENT);
        Double previousTotal = previousCredits.stream().mapToDouble(Credit::getTotalAmount).sum();
        
        Double evolution = previousTotal > 0 ? ((totalAmount - previousTotal) / previousTotal) * 100 : 0.0;
        
        return new SalesMetricsDto(totalAmount, totalProfit, profitMargin, count, evolution, averageSaleAmount);
    }
    
    public CollectionMetricsDto getCollectionMetrics(LocalDate startDate, LocalDate endDate) {
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);
        
        Double totalCollected = creditTimelineRepository.sumAmountByDateAndCreditType(startDateTime, endDateTime, "CREDIT");
        if (totalCollected == null) totalCollected = 0.0;
        
        // Calcul du taux de recouvrement
        List<Credit> activeCredits = creditRepository.findByStatusAndTypeAndClientType(CreditStatus.INPROGRESS, OperationType.CREDIT, ClientType.CLIENT);
        Double totalExpected = activeCredits.stream()
            .mapToDouble(Credit::getTotalAmount)
            .sum();
            
        Double collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0.0;
        
        // Évolution
        long daysDiff = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate);
        LocalDateTime previousStart = startDate.minusDays(daysDiff).atStartOfDay();
        LocalDateTime previousEnd = startDate.minusDays(1).atTime(23, 59, 59);
        
        Double previousCollected = creditTimelineRepository.sumAmountByDateAndCreditType(previousStart, previousEnd, "CREDIT");
        if (previousCollected == null) previousCollected = 0.0;
        
        Double evolution = previousCollected > 0 ? ((totalCollected - previousCollected) / previousCollected) * 100 : 0.0;
        
        return new CollectionMetricsDto(totalCollected, collectionRate, evolution, 0, 0);
    }
    
    public StockMetricsDto getStockMetrics() {

        return articlesService.getStockMetrics();
    }
    
    public PortfolioMetricsDto getPortfolioMetrics() {
        List<Credit> activeCredits = creditRepository.findByStatusAndTypeAndClientType(CreditStatus.INPROGRESS, OperationType.CREDIT, ClientType.CLIENT);
        
        Integer activeCount = activeCredits.size();

        Double totalOutstanding = activeCredits.stream()
                .mapToDouble(credit -> credit.getTotalAmountRemaining())
                .sum();
            
        LocalDate now = LocalDate.now();
        
        Double totalOverdue = activeCredits.stream()
            .filter(c -> c.getExpectedEndDate() != null && c.getExpectedEndDate().isBefore(now))
            .mapToDouble(Credit::getTotalAmountRemaining)
            .sum();
            
        Double par7 = activeCredits.stream()
            .filter(c -> c.getExpectedEndDate() != null && c.getExpectedEndDate().isBefore(now.minusDays(7)))
            .mapToDouble(Credit::getTotalAmountRemaining)
            .sum();
            
        Double par15 = activeCredits.stream()
            .filter(c -> c.getExpectedEndDate() != null && c.getExpectedEndDate().isBefore(now.minusDays(15)))
            .mapToDouble(Credit::getTotalAmountRemaining)
            .sum();
            
        Double par30 = activeCredits.stream()
            .filter(c -> c.getExpectedEndDate() != null && c.getExpectedEndDate().isBefore(now.minusDays(30)))
            .mapToDouble(Credit::getTotalAmountRemaining)
            .sum();
        
        return new PortfolioMetricsDto(activeCount, totalOutstanding, totalOverdue, par7, par15, par30);
    }
}
