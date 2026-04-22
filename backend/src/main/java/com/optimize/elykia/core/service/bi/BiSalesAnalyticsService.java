package com.optimize.elykia.core.service.bi;

import com.optimize.elykia.core.dto.bi.*;
import com.optimize.elykia.core.repository.CreditRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@Slf4j
public class BiSalesAnalyticsService {
    
    private final CreditRepository creditRepository;
    
    /**
     * Tendances des ventes par jour - Optimized with native queries
     */
    public List<SalesTrendDto> getSalesTrends(LocalDate startDate, LocalDate endDate) {
        long startTime = System.currentTimeMillis();
        
        // Use optimized native query instead of loading all credits and grouping in memory
        List<SalesTrendProjection> projections = creditRepository.getSalesTrends(startDate, endDate);
        
        List<SalesTrendDto> result = projections.stream()
            .map(proj -> new SalesTrendDto(
                proj.getDate(),
                proj.getSalesCount(),
                proj.getTotalAmount(),
                proj.getTotalProfit(),
                proj.getAvgAmount()
            ))
            .collect(Collectors.toList());
        
        long endTime = System.currentTimeMillis();
        log.debug("getSalesTrends executed in {} ms for period {} to {}", (endTime - startTime), startDate, endDate);
        
        return result;
    }
    
    /**
     * Performance des commerciaux - Optimized with native queries
     */
    public List<CommercialPerformanceDto> getCommercialRanking(LocalDate startDate, LocalDate endDate) {
        long startTime = System.currentTimeMillis();
        
        // Use optimized native query instead of multiple database calls and Stream operations
        List<CommercialSalesProjection> projections = creditRepository.getSalesByCommercial(startDate, endDate);
        
        List<CommercialPerformanceDto> result = projections.stream()
            .map(proj -> {
                CommercialPerformanceDto dto = new CommercialPerformanceDto();
                dto.setCollector(proj.getCollector());
                dto.setPeriodStart(startDate);
                dto.setPeriodEnd(endDate);
                dto.setTotalSalesCount(proj.getSalesCount());
                dto.setTotalSalesAmount(proj.getTotalAmount());
                dto.setTotalProfit(proj.getTotalProfit());
                dto.setAverageSaleAmount(proj.getAvgAmount());
                dto.setTotalCollected(proj.getTotalCollected());
                dto.setCollectionRate(proj.getTotalAmount() > 0 ? 
                    (proj.getTotalCollected() / proj.getTotalAmount()) * 100 : 0.0);
                return dto;
            })
            .collect(Collectors.toList());
        
        long endTime = System.currentTimeMillis();
        log.debug("getCommercialRanking executed in {} ms for period {} to {}", (endTime - startTime), startDate, endDate);
        
        return result;
    }
    
    /**
     * Performance des articles - Optimized with native queries
     */
    public List<ArticlePerformanceDto> getArticlePerformance(LocalDate startDate, LocalDate endDate) {
        long startTime = System.currentTimeMillis();
        
        // Use optimized native query with JOINs instead of manual aggregation
        List<ArticlePerformanceProjection> projections = creditRepository.getArticlePerformance(startDate, endDate);
        
        // Calculate total revenue for contribution percentage
        Double totalRevenue = projections.stream()
            .mapToDouble(ArticlePerformanceProjection::getTotalRevenue)
            .sum();
        
        List<ArticlePerformanceDto> result = projections.stream()
            .map(proj -> {
                Double profitMargin = proj.getTotalRevenue() > 0 ? 
                    (proj.getTotalProfit() / proj.getTotalRevenue()) * 100 : 0.0;
                Double contribution = totalRevenue > 0 ? 
                    (proj.getTotalRevenue() / totalRevenue) * 100 : 0.0;
                
                return new ArticlePerformanceDto(
                    proj.getArticleId(),
                    proj.getArticleName(),
                    proj.getCategory(),
                    proj.getQuantitySold(),
                    proj.getTotalRevenue(),
                    proj.getTotalProfit(),
                    profitMargin,
                    proj.getTurnoverRate(),
                    proj.getStockQuantity(),
                    contribution
                );
            })
            .collect(Collectors.toList());
        
        long endTime = System.currentTimeMillis();
        log.debug("getArticlePerformance executed in {} ms for period {} to {}", (endTime - startTime), startDate, endDate);
        
        return result;
    }
}
