package com.optimize.elykia.core.service.bi;

import com.optimize.elykia.core.dto.bi.*;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.service.stock.StockMovementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@Slf4j
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
        long startTime = System.currentTimeMillis();
        
        // Use optimized native query instead of loading all credits into memory
        var projection = creditRepository.getSalesMetrics(startDate, endDate);
        
        Double totalAmount = projection.getTotalAmount();
        Double totalProfit = projection.getTotalProfit();
        Integer count = projection.getSalesCount();
        Double averageSaleAmount = projection.getAvgAmount();
        
        Double profitMargin = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0.0;
        
        // Calcul de l'évolution (comparaison avec période précédente)
        long daysDiff = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate);
        LocalDate previousStart = startDate.minusDays(daysDiff);
        LocalDate previousEnd = startDate.minusDays(1);
        
        var previousProjection = creditRepository.getSalesMetrics(previousStart, previousEnd);
        Double previousTotal = previousProjection.getTotalAmount();
        
        Double evolution = previousTotal > 0 ? ((totalAmount - previousTotal) / previousTotal) * 100 : 0.0;
        
        long endTime = System.currentTimeMillis();
        log.debug("getSalesMetrics executed in {} ms for period {} to {}", (endTime - startTime), startDate, endDate);
        
        return new SalesMetricsDto(totalAmount, totalProfit, profitMargin, count, evolution, averageSaleAmount);
    }
    
    public CollectionMetricsDto getCollectionMetrics(LocalDate startDate, LocalDate endDate) {
        long startTime = System.currentTimeMillis();
        
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);
        
        Double totalCollected = creditTimelineRepository.sumAmountByDateAndCreditType(startDateTime, endDateTime, "CREDIT");
        if (totalCollected == null) totalCollected = 0.0;
        
        // Use optimized native query instead of loading all active credits into memory
        Double totalExpected = creditRepository.getTotalExpectedAmountForActiveCredits();
        
        Double collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0.0;
        
        // Évolution
        long daysDiff = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate);
        LocalDateTime previousStart = startDate.minusDays(daysDiff).atStartOfDay();
        LocalDateTime previousEnd = startDate.minusDays(1).atTime(23, 59, 59);
        
        Double previousCollected = creditTimelineRepository.sumAmountByDateAndCreditType(previousStart, previousEnd, "CREDIT");
        if (previousCollected == null) previousCollected = 0.0;
        
        Double evolution = previousCollected > 0 ? ((totalCollected - previousCollected) / previousCollected) * 100 : 0.0;
        
        long endTime = System.currentTimeMillis();
        log.debug("getCollectionMetrics executed in {} ms for period {} to {}", (endTime - startTime), startDate, endDate);
        
        return new CollectionMetricsDto(totalCollected, collectionRate, evolution, 0, 0);
    }
    
    public StockMetricsDto getStockMetrics() {

        return articlesService.getStockMetrics();
    }
    
    public PortfolioMetricsDto getPortfolioMetrics() {
        long startTime = System.currentTimeMillis();
        
        // Use optimized native query instead of loading all active credits into memory
        var projection = creditRepository.getPortfolioMetrics();
        
        Integer activeCount = projection.getActiveCount();
        Double totalOutstanding = projection.getTotalOutstanding();
        Double totalOverdue = projection.getTotalOverdue();
        Double par7 = projection.getPar7();
        Double par15 = projection.getPar15();
        Double par30 = projection.getPar30();
        
        long endTime = System.currentTimeMillis();
        log.debug("getPortfolioMetrics executed in {} ms", (endTime - startTime));
        
        return new PortfolioMetricsDto(activeCount, totalOutstanding, totalOverdue, par7, par15, par30);
    }
}
